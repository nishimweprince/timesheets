import * as React from "react"
import type { PaginationState } from "@tanstack/react-table"
import { useNavigate, useSearchParams } from "react-router-dom"

import { toIsoDate, parseDayParam, employeeName } from "@/lib/format"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import {
  fetchDayClockIns,
  fetchExceptions,
  fetchOrgSessions,
} from "@/states/features/attendance.slice"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import {
  cancelInstance,
  cancelPatternAssignment,
  closeCancelInstanceConfirm,
  closeRemoveAssignmentConfirm,
  fetchPatternAssignments,
  fetchPatternAssignmentsPage,
  fetchInstances,
  fetchInstancesPage,
  fetchPatterns,
  openCancelInstanceConfirm,
  openRemoveAssignmentConfirm,
} from "@/states/features/scheduling.slice"
import {
  ShiftAssignmentStatus,
  ShiftInstanceStatus,
  type ShiftInstance,
  type ShiftPattern,
} from "@/lib/api/scheduling.api"
import { type WorkSession } from "@/lib/api/attendance.api"
import { showApiErrorToast } from "@/lib/api/errors"

import type { SchedulingView } from "./scheduling.constants"
import { buildCoverageMetrics } from "./scheduling.metrics"
import {
  buildAssignmentColumns,
  buildClockInColumns,
  buildInstanceColumns,
} from "./columns"

/**
 * Container logic for the scheduling page: data fetching, URL sync, derived
 * metrics, table columns, and the cancel/remove confirmation handlers. Keeping
 * this in a hook lets `Scheduling.tsx` stay a thin presentational shell.
 */
export function useScheduling(view: SchedulingView) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const patterns = useAppSelector((s) => s.scheduling.patterns)
  const instances = useAppSelector((s) => s.scheduling.instances)
  const patternAssignments = useAppSelector((s) => s.scheduling.patternAssignments)
  const instancesPage = useAppSelector((s) => s.scheduling.instancesPage)
  const patternAssignmentsPage = useAppSelector((s) => s.scheduling.patternAssignmentsPage)
  const statusInstancesPage = useAppSelector((s) => s.scheduling.status.instancesPage)
  const statusPatternAssignmentsPage = useAppSelector((s) => s.scheduling.status.patternAssignmentsPage)
  const orgSessions = useAppSelector((s) => s.attendance.orgSessions)
  const exceptions = useAppSelector((s) => s.attendance.exceptions)
  const employees = useAppSelector((s) => s.employeeManagement.employees)
  const cancelInstanceConfirm = useAppSelector((s) => s.scheduling.confirmCancelInstance)
  const removeAssignmentConfirm = useAppSelector((s) => s.scheduling.confirmRemoveAssignment)
  const isCancellingInstance = useAppSelector((s) => s.scheduling.status.cancelInstance === "loading")
  const isRemovingAssignment = useAppSelector(
    (s) => s.scheduling.status.cancelPatternAssignment === "loading",
  )
  const dayClockIns = useAppSelector((s) => s.attendance.dayClockIns)
  const statusDayClockIns = useAppSelector((s) => s.attendance.status.dayClockIns)

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  })

  // Reset to the first page when switching between the setup views, since the
  // component instance persists across /scheduling/shifts <-> /scheduling/assignments.
  // Storing the previous view in state and adjusting during render is React's
  // recommended pattern for resetting state on a prop change.
  const [previousView, setPreviousView] = React.useState(view)
  if (previousView !== view) {
    setPreviousView(view)
    if (pagination.pageIndex !== 0) {
      setPagination((p) => ({ ...p, pageIndex: 0 }))
    }
  }
  const [overrideTarget, setOverrideTarget] = React.useState<ShiftInstance | null>(null)
  const [calendarRange, setCalendarRange] = React.useState(() => {
    const today = new Date()
    const from = new Date(today)
    const to = new Date(today)
    to.setDate(today.getDate() + 35)
    return { from: toIsoDate(from), to: toIsoDate(to) }
  })
  const [includeCancelled, setIncludeCancelled] = React.useState(false)
  const [includeCompleted, setIncludeCompleted] = React.useState(false)

  const dayParam = searchParams.get("day")
  const clockInDay = React.useMemo(() => {
    if (view !== "clock-ins") return new Date()
    return parseDayParam(dayParam) ?? new Date()
  }, [view, dayParam])

  // Keep `?day=` in the URL for clock-ins so detail → back restores the filter.
  React.useEffect(() => {
    if (view !== "clock-ins") return
    const iso = toIsoDate(clockInDay)
    if (searchParams.get("day") === iso) return
    const next = new URLSearchParams(searchParams)
    next.set("day", iso)
    setSearchParams(next, { replace: true })
  }, [view, clockInDay, searchParams, setSearchParams])

  const setClockInDay = React.useCallback(
    (date: Date) => {
      const iso = toIsoDate(date)
      const next = new URLSearchParams(searchParams)
      next.set("day", iso)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  React.useEffect(() => {
    dispatch(fetchPatterns())
    dispatch(fetchPatternAssignments())
    dispatch(fetchInstances({ statuses: [ShiftInstanceStatus.SCHEDULED, ShiftInstanceStatus.MODIFIED].join(",") }))
    dispatch(fetchEmployees())
    dispatch(fetchOrgSessions())
    dispatch(fetchExceptions())
  }, [dispatch])

  React.useEffect(() => {
    const params = { page: pagination.pageIndex + 1, pageSize: pagination.pageSize }
    if (view === "shifts") dispatch(fetchInstancesPage(params))
    else if (view === "assignments") dispatch(fetchPatternAssignmentsPage(params))
  }, [dispatch, view, pagination.pageIndex, pagination.pageSize])

  const calendarStatuses = React.useMemo(
    () =>
      [
        ShiftInstanceStatus.SCHEDULED,
        ShiftInstanceStatus.MODIFIED,
        ShiftInstanceStatus.CANCELLED,
        ShiftInstanceStatus.COMPLETED,
      ].join(","),
    [],
  )

  React.useEffect(() => {
    if (view !== "coverage") return
    dispatch(
      fetchInstances({
        from: calendarRange.from,
        to: calendarRange.to,
        statuses: calendarStatuses,
        pageSize: 500,
      }),
    )
  }, [view, calendarRange.from, calendarRange.to, calendarStatuses, dispatch])

  const clockInDayIso = toIsoDate(clockInDay)
  React.useEffect(() => {
    if (view !== "clock-ins") return
    const [y, m, d] = clockInDayIso.split("-").map(Number)
    const from = new Date(y, m - 1, d, 0, 0, 0, 0)
    const to = new Date(y, m - 1, d, 23, 59, 59, 999)
    dispatch(fetchDayClockIns({ from: from.toISOString(), to: to.toISOString() }))
  }, [view, clockInDayIso, dispatch])

  const openSessionDetail = React.useCallback(
    (session: WorkSession) => {
      const search = searchParams.toString()
      navigate({
        pathname: `/scheduling/clock-ins/${session.id}`,
        search: search ? `?${search}` : "",
      })
    },
    [navigate, searchParams],
  )

  const handleCalendarRangeChange = React.useCallback((from: string, to: string) => {
    setCalendarRange((current) =>
      current.from === from && current.to === to ? current : { from, to },
    )
  }, [])

  const employeeByMembershipId = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const employee of employees) map.set(employee.membershipId, employeeName(employee))
    return map
  }, [employees])

  const patternsById = React.useMemo(() => {
    const map = new Map<string, ShiftPattern>()
    for (const pattern of patterns) map.set(pattern.id, pattern)
    return map
  }, [patterns])

  const assignedEmployeeCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const assignment of patternAssignments) {
      if (assignment.status !== ShiftAssignmentStatus.ACTIVE) continue
      counts.set(assignment.shiftPatternId, (counts.get(assignment.shiftPatternId) ?? 0) + 1)
    }
    return counts
  }, [patternAssignments])

  const coverageMetrics = React.useMemo(
    () =>
      buildCoverageMetrics({
        instances,
        assignedEmployeeCounts,
        orgSessions,
        exceptionCount: exceptions.length,
        range: calendarRange,
      }),
    [assignedEmployeeCounts, calendarRange, exceptions.length, instances, orgSessions],
  )

  const refreshInstances = React.useCallback(() => {
    dispatch(fetchInstances({}))
    dispatch(fetchInstancesPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }))
  }, [dispatch, pagination.pageIndex, pagination.pageSize])

  const handleConfirmCancelInstance = React.useCallback(async () => {
    const target = cancelInstanceConfirm.target
    if (!target) return
    try {
      await dispatch(cancelInstance(target.id)).unwrap()
      refreshInstances()
      if (overrideTarget?.id === target.id) setOverrideTarget(null)
      dispatch(closeCancelInstanceConfirm())
    } catch (err) {
      showApiErrorToast(err)
    }
  }, [cancelInstanceConfirm.target, dispatch, overrideTarget, refreshInstances])

  const handleConfirmRemoveAssignment = React.useCallback(async () => {
    const target = removeAssignmentConfirm.target
    if (!target) return
    try {
      await dispatch(cancelPatternAssignment(target.id)).unwrap()
      dispatch(fetchPatternAssignments())
      dispatch(
        fetchPatternAssignmentsPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }),
      )
      dispatch(closeRemoveAssignmentConfirm())
    } catch (err) {
      showApiErrorToast(err)
    }
  }, [dispatch, pagination.pageIndex, pagination.pageSize, removeAssignmentConfirm.target])

  const onNewShiftCreated = React.useCallback(() => {
    dispatch(fetchPatterns())
    refreshInstances()
  }, [dispatch, refreshInstances])

  const onAssignmentCreated = React.useCallback(() => {
    dispatch(fetchPatternAssignments())
    dispatch(
      fetchPatternAssignmentsPage({ page: pagination.pageIndex + 1, pageSize: pagination.pageSize }),
    )
  }, [dispatch, pagination.pageIndex, pagination.pageSize])

  const closeCancelConfirm = React.useCallback(
    () => dispatch(closeCancelInstanceConfirm()),
    [dispatch],
  )
  const closeRemoveConfirm = React.useCallback(
    () => dispatch(closeRemoveAssignmentConfirm()),
    [dispatch],
  )

  const instanceColumns = React.useMemo(
    () =>
      buildInstanceColumns({
        patternsById,
        assignedEmployeeCounts,
        onOverride: setOverrideTarget,
        onCancel: (instance) => dispatch(openCancelInstanceConfirm(instance)),
      }),
    [assignedEmployeeCounts, dispatch, patternsById],
  )

  const assignmentColumns = React.useMemo(
    () =>
      buildAssignmentColumns({
        patternsById,
        employeeByMembershipId,
        onRemove: (assignment) => dispatch(openRemoveAssignmentConfirm(assignment)),
      }),
    [dispatch, employeeByMembershipId, patternsById],
  )

  const clockInColumns = React.useMemo(
    () => buildClockInColumns({ employeeByMembershipId }),
    [employeeByMembershipId],
  )

  const isLoadingCurrent =
    view === "assignments"
      ? statusPatternAssignmentsPage === "loading" && patternAssignmentsPage.data.length === 0
      : statusInstancesPage === "loading" && instancesPage.data.length === 0

  const isFetchingCurrent =
    view === "assignments"
      ? statusPatternAssignmentsPage === "loading" && patternAssignmentsPage.data.length > 0
      : statusInstancesPage === "loading" && instancesPage.data.length > 0

  return {
    // data
    patterns,
    instances,
    patternAssignments,
    instancesPage,
    patternAssignmentsPage,
    dayClockIns,
    statusDayClockIns,
    coverageMetrics,
    // columns
    instanceColumns,
    assignmentColumns,
    clockInColumns,
    // pagination + loading
    pagination,
    setPagination,
    isLoadingCurrent,
    isFetchingCurrent,
    // calendar
    calendarRange,
    handleCalendarRangeChange,
    includeCancelled,
    setIncludeCancelled,
    includeCompleted,
    setIncludeCompleted,
    // clock-ins
    clockInDay,
    setClockInDay,
    openSessionDetail,
    // shift details sheet
    overrideTarget,
    setOverrideTarget,
    refreshInstances,
    // confirmations
    cancelInstanceConfirm,
    removeAssignmentConfirm,
    isCancellingInstance,
    isRemovingAssignment,
    handleConfirmCancelInstance,
    handleConfirmRemoveAssignment,
    closeCancelConfirm,
    closeRemoveConfirm,
    // create flows
    onNewShiftCreated,
    onAssignmentCreated,
  }
}
