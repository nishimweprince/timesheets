import * as React from "react"
import type { PaginationState } from "@tanstack/react-table"
import {
  CameraIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { fetchHistory, fetchHistorySummary } from "@/states/features/attendance.slice"
import { fetchMyShifts } from "@/states/features/scheduling.slice"
import { ShiftInstanceStatus, type MyShift } from "@/lib/api/scheduling.api"
import { useClockSession } from "@/hooks/use-clock-session"
import { formatDate, formatTime, sessionToEntry } from "@/lib/attendance.utils"

import { shiftDayLabel, upcomingShiftRange, type StatusFilter } from "./timesheets.constants"

/**
 * Container logic for the employee timesheets page: clock session, history
 * fetching + pagination, upcoming shifts, and derived summary/readiness data.
 * Keeping this in a hook lets `Timesheets.tsx` stay a thin presentational shell.
 */
export function useTimesheets() {
  const dispatch = useAppDispatch()

  const history = useAppSelector((s) => s.attendance.history)
  const historySummary = useAppSelector((s) => s.attendance.historySummary)
  const isHistoryLoading = useAppSelector((s) => s.attendance.status.history === "loading")
  const isLoading = isHistoryLoading && history.data.length === 0
  const isFetching = isHistoryLoading && history.data.length > 0
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? [])
  const myShifts = useAppSelector((s) => s.scheduling.myShifts)
  const areShiftsLoading = useAppSelector((s) => s.scheduling.status.myShifts === "loading")

  const canClockInOut = permissions.includes("attendance.clock_in.self")
  const canViewShifts = permissions.includes("shift.read")

  const {
    currentSession,
    isOnShift,
    clockInLoading,
    clockOutLoading,
    breakLoading,
    actionLoading,
    effectivePolicy,
    handleClockIn,
    handleClockOut,
    handleStartBreak,
    handleEndBreak,
  } = useClockSession()

  const [cameraModalOpen, setCameraModalOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<'in' | 'out' | null>(null)
  const [selectedShift, setSelectedShift] = React.useState<MyShift | null>(null)

  const handleClockButton = () => {
    const needsPhoto = isOnShift
      ? effectivePolicy?.requireClockOutPhoto
      : effectivePolicy?.requireClockInPhoto
    if (needsPhoto) {
      setPendingAction(isOnShift ? 'out' : 'in')
      setCameraModalOpen(true)
    } else {
      if (isOnShift) handleClockOut()
      else handleClockIn()
    }
  }

  const closeCameraModal = React.useCallback(() => {
    setCameraModalOpen(false)
    setPendingAction(null)
  }, [])

  const handleCameraCapture = React.useCallback(
    (mediaAssetId: string) => {
      setCameraModalOpen(false)
      if (pendingAction === 'in') handleClockIn(mediaAssetId)
      else handleClockOut(mediaAssetId)
      setPendingAction(null)
    },
    [pendingAction, handleClockIn, handleClockOut],
  )

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("All")
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  })

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as StatusFilter)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  React.useEffect(() => {
    dispatch(
      fetchHistory({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        status: statusFilter === "All" ? undefined : statusFilter,
      })
    )
  }, [dispatch, pagination.pageIndex, pagination.pageSize, statusFilter])

  React.useEffect(() => {
    dispatch(fetchHistorySummary())
  }, [dispatch])

  const [myShiftRange, setMyShiftRange] = React.useState(() => upcomingShiftRange())

  React.useEffect(() => {
    if (!canViewShifts) return
    dispatch(fetchMyShifts(myShiftRange))
  }, [dispatch, canViewShifts, myShiftRange])

  const handleMyShiftCalendarRangeChange = React.useCallback((from: string, to: string) => {
    setMyShiftRange((current) =>
      current.from === from && current.to === to ? current : { from, to },
    )
  }, [])

  const myUpcomingShifts = React.useMemo(() => {
    const now = new Date().getTime()
    return myShifts
      .filter(
        (myShift) =>
          (myShift.status === ShiftInstanceStatus.SCHEDULED ||
            myShift.status === ShiftInstanceStatus.MODIFIED) &&
          new Date(myShift.endAt).getTime() >= now
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }, [myShifts])

  const [nextShift, ...laterShifts] = myUpcomingShifts
  const currentShiftLabel = isOnShift && currentSession
    ? `Started ${formatTime(currentSession.actualClockInAt)}`
    : nextShift
      ? `${shiftDayLabel(nextShift.startAt)} at ${formatTime(nextShift.startAt)}`
      : "No upcoming shift"
  const readinessItems = [
    {
      label: effectivePolicy?.requireLocation ? "Location required" : "Location ready",
      icon: MapPinIcon,
    },
    {
      label:
        effectivePolicy?.requireClockInPhoto || effectivePolicy?.requireClockOutPhoto
          ? "Photo required"
          : "Photo optional",
      icon: CameraIcon,
    },
    {
      label: isOnShift ? "Clock-out available" : "Clock-in available",
      icon: ShieldCheckIcon,
    },
  ]

  const entries = React.useMemo(() => history.data.map(sessionToEntry), [history.data])

  const totalHours = React.useMemo(
    () =>
      Math.round(
        historySummary.reduce((sum, s) => sum + ((s.netMinutes ?? s.grossMinutes ?? 0) / 60), 0) * 10
      ) / 10,
    [historySummary]
  )

  const daysWorked = React.useMemo(
    () => new Set(historySummary.map((s) => formatDate(s.actualClockInAt))).size,
    [historySummary]
  )

  const pendingCount = React.useMemo(
    () => historySummary.map(sessionToEntry).filter((e) => e.status === "Pending").length,
    [historySummary]
  )

  const summaryCards = [
    { label: "Total hours", value: String(totalHours), sub: "all time" },
    { label: "Days worked", value: String(daysWorked), sub: "all time" },
    { label: "Pending review", value: String(pendingCount), sub: "sessions" },
  ]

  return {
    // permissions
    canClockInOut,
    canViewShifts,
    // clock session
    isOnShift,
    clockInLoading,
    clockOutLoading,
    breakLoading,
    actionLoading,
    handleStartBreak,
    handleEndBreak,
    handleClockButton,
    // camera
    cameraModalOpen,
    pendingAction,
    closeCameraModal,
    handleCameraCapture,
    // shift detail modal
    selectedShift,
    setSelectedShift,
    // history table
    entries,
    history,
    isLoading,
    isFetching,
    pagination,
    setPagination,
    statusFilter,
    handleStatusFilterChange,
    // shifts
    myUpcomingShifts,
    nextShift,
    laterShifts,
    areShiftsLoading,
    handleMyShiftCalendarRangeChange,
    // derived display
    currentShiftLabel,
    readinessItems,
    summaryCards,
  }
}
