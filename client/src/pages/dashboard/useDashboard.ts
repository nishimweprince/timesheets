import * as React from "react"
import type { PaginationState } from "@tanstack/react-table"
import {
  AlertTriangleIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  Clock3Icon,
  LogInIcon,
  UsersIcon,
} from "lucide-react"

import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import {
  fetchExceptions,
  fetchHistory,
  fetchHistorySummary,
  fetchOrgSessions,
} from "@/states/features/attendance.slice"
import { fetchMyShifts } from "@/states/features/scheduling.slice"
import { WorkSessionStatus } from "@/lib/api/attendance.api"
import { ShiftInstanceStatus } from "@/lib/api/scheduling.api"
import { useClockSession } from "@/hooks/use-clock-session"
import {
  computeWeeklyHours,
  formatDate,
  formatTime,
  sessionToEntry,
} from "@/lib/attendance.utils"

import {
  formatElapsed,
  greetingForNow,
  isPendingSession,
  upcomingShiftRange,
  type AdminTile,
} from "./dashboard.constants"

/**
 * Container logic for the dashboard home: permissions, data fetching, the clock
 * session, derived metrics, and the admin shortcut tiles. Keeping this in a hook
 * lets `Dashboard.tsx` stay a thin presentational shell.
 */
export function useDashboard() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)

  const history = useAppSelector((s) => s.attendance.history)
  const historySummary = useAppSelector((s) => s.attendance.historySummary)
  const isHistoryLoading = useAppSelector((s) => s.attendance.status.history === "loading")
  const isRecentLoading = isHistoryLoading && history.data.length === 0
  const isRecentFetching = isHistoryLoading && history.data.length > 0
  const orgSessions = useAppSelector((s) => s.attendance.orgSessions)
  const exceptions = useAppSelector((s) => s.attendance.exceptions)
  const myShifts = useAppSelector((s) => s.scheduling.myShifts)
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? [])
  const roleNames = useAppSelector((s) => s.auth.user?.roleNames ?? [])

  const canClockInOut = permissions.includes("attendance.clock_in.self")
  const canReadSelf = permissions.includes("attendance.read.self")
  const canManageShifts = permissions.includes("shift.create")
  const canReadOrgAttendance = permissions.includes("attendance.read.organization")
  const canReadReports = permissions.includes("report.read")
  const canReadEmployees = permissions.includes("employee.read")
  // Organization admins operate the product; they do not clock in or keep personal timesheets.
  const isOrganizationAdmin = roleNames.includes("Organization Admin")
  const canUseEmployeeAttendance = canClockInOut && !isOrganizationAdmin
  const isAdminHome =
    isOrganizationAdmin ||
    canManageShifts ||
    canReadOrgAttendance ||
    canReadReports ||
    canReadEmployees

  const {
    currentSession,
    isOnShift,
    clockInLoading,
    clockOutLoading,
    actionLoading,
    effectivePolicy,
    handleClockIn,
    handleClockOut,
  } = useClockSession(canUseEmployeeAttendance)

  const [cameraModalOpen, setCameraModalOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<"in" | "out" | null>(null)
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const [recentPagination, setRecentPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 4,
  })
  const [myShiftRange] = React.useState(() => upcomingShiftRange())

  const handleClockButton = () => {
    const needsPhoto = isOnShift
      ? effectivePolicy?.requireClockOutPhoto
      : effectivePolicy?.requireClockInPhoto
    if (needsPhoto) {
      setPendingAction(isOnShift ? "out" : "in")
      setCameraModalOpen(true)
    } else if (isOnShift) {
      handleClockOut()
    } else {
      handleClockIn()
    }
  }

  React.useEffect(() => {
    if (!canUseEmployeeAttendance) return
    dispatch(
      fetchHistory({
        page: recentPagination.pageIndex + 1,
        pageSize: recentPagination.pageSize,
      }),
    )
  }, [canUseEmployeeAttendance, dispatch, recentPagination.pageIndex, recentPagination.pageSize])

  React.useEffect(() => {
    if (!canUseEmployeeAttendance && !canReadSelf) return
    dispatch(fetchHistorySummary())
  }, [canUseEmployeeAttendance, canReadSelf, dispatch])

  React.useEffect(() => {
    if (!canUseEmployeeAttendance) return
    dispatch(fetchMyShifts(myShiftRange))
  }, [canUseEmployeeAttendance, dispatch, myShiftRange])

  React.useEffect(() => {
    if (!canReadOrgAttendance && !canManageShifts) return
    dispatch(fetchOrgSessions())
    dispatch(fetchExceptions())
  }, [canManageShifts, canReadOrgAttendance, dispatch])

  React.useEffect(() => {
    if (!isOnShift || !currentSession) return
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return
    const id = window.setInterval(() => setNowMs(Date.now()), 30000)
    return () => window.clearInterval(id)
  }, [currentSession, isOnShift])

  const weeklyData = React.useMemo(
    () => computeWeeklyHours(historySummary),
    [historySummary],
  )

  const weekHours = React.useMemo(
    () => Math.round(weeklyData.reduce((sum, d) => sum + d.hours, 0) * 10) / 10,
    [weeklyData],
  )

  const todayHours = React.useMemo(() => {
    const today = new Date().toDateString()
    const minutes = historySummary
      .filter((s) => new Date(s.actualClockInAt).toDateString() === today)
      .reduce((sum, s) => sum + (s.netMinutes ?? s.grossMinutes ?? 0), 0)
    return Math.round((minutes / 60) * 10) / 10
  }, [historySummary])

  const lastCompletedSession = React.useMemo(() => {
    return [...historySummary]
      .filter((s) => s.actualClockOutAt)
      .sort(
        (a, b) =>
          new Date(b.actualClockOutAt!).getTime() - new Date(a.actualClockOutAt!).getTime(),
      )[0]
  }, [historySummary])

  const nextShift = React.useMemo(() => {
    return myShifts
      .filter(
        (shift) =>
          (shift.status === ShiftInstanceStatus.SCHEDULED ||
            shift.status === ShiftInstanceStatus.MODIFIED) &&
          new Date(shift.endAt).getTime() >= nowMs,
      )
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0]
  }, [myShifts, nowMs])

  const pendingReviewCount = React.useMemo(
    () => orgSessions.filter(isPendingSession).length,
    [orgSessions],
  )
  const openExceptionCount = exceptions.length
  const teamOnDuty = orgSessions.filter((s) => s.status === WorkSessionStatus.OPEN).length

  const recentEntries = React.useMemo(() => history.data.map(sessionToEntry), [history.data])

  const displayName = user?.firstName || user?.fullName?.split(" ")[0] || "there"
  const greeting = `${greetingForNow()}, ${displayName}`

  const dutySubtitle = isOnShift && currentSession
    ? `Started ${formatTime(currentSession.actualClockInAt)} · ${formatElapsed(currentSession.actualClockInAt, nowMs)} elapsed`
    : lastCompletedSession?.actualClockOutAt
      ? `Last clocked out ${formatDate(lastCompletedSession.actualClockOutAt)} at ${formatTime(lastCompletedSession.actualClockOutAt)}`
      : "Ready when you are"

  const adminTiles = [
    canReadOrgAttendance || canManageShifts
      ? {
          title: "Review queue",
          description: "Approve, reject, or lock work sessions.",
          href: "/reports/review",
          icon: ClipboardCheckIcon,
          count: pendingReviewCount,
          countLabel: "pending",
        }
      : null,
    canReadOrgAttendance || canManageShifts
      ? {
          title: "Exception queue",
          description: "Resolve or dismiss open policy flags.",
          href: "/reports/exception-queue",
          icon: AlertTriangleIcon,
          count: openExceptionCount,
          countLabel: "open",
        }
      : null,
    canManageShifts
      ? {
          title: "Coverage",
          description: "Scan staffing gaps and open shift details.",
          href: "/scheduling",
          icon: CalendarIcon,
          count: null as number | null,
          countLabel: null as string | null,
        }
      : null,
    canManageShifts
      ? {
          title: "Clock-ins",
          description: "Browse attendance captures for a day.",
          href: "/scheduling/clock-ins",
          icon: LogInIcon,
          count: null,
          countLabel: null,
        }
      : null,
    canReadEmployees
      ? {
          title: "Team",
          description: "Employees, invites, and teams.",
          href: "/team",
          icon: UsersIcon,
          count: null,
          countLabel: null,
        }
      : null,
    canReadReports
      ? {
          title: "Hours report",
          description: "Aggregated hours by employee.",
          href: "/reports",
          icon: Clock3Icon,
          count: null,
          countLabel: null,
        }
      : null,
  ].filter(Boolean) as AdminTile[]

  return {
    // permissions / mode
    canUseEmployeeAttendance,
    isAdminHome,
    canReadOrgAttendance,
    canManageShifts,
    // header
    greeting,
    // clock session
    currentSession,
    isOnShift,
    clockInLoading,
    clockOutLoading,
    actionLoading,
    handleClockButton,
    handleClockIn,
    handleClockOut,
    dutySubtitle,
    nowMs,
    // camera modal
    cameraModalOpen,
    setCameraModalOpen,
    pendingAction,
    setPendingAction,
    // admin strips / tiles
    pendingReviewCount,
    openExceptionCount,
    teamOnDuty,
    adminTiles,
    // employee stats
    todayHours,
    weekHours,
    nextShift,
    weeklyData,
    // recent entries table
    recentEntries,
    history,
    recentPagination,
    setRecentPagination,
    isRecentLoading,
    isRecentFetching,
  }
}
