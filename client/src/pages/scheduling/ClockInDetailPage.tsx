"use client"

import * as React from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { PageHeader } from "@/components/reusable/layout"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { LocationMap } from "@/components/reusable/maps/LocationMap"
import {
  formatDeviceClass,
  formatDeviceSummary,
} from "@/lib/device"
import { shortId, formatDateTime, formatDuration, employeeName } from "@/lib/format"
import {
  type AttendanceEventDetail,
  type WorkSession,
} from "@/lib/api/attendance.api"
import {
  clearSessionDetail,
  fetchSessionDetail,
} from "@/states/features/attendance.slice"
import { fetchEmployees } from "@/states/features/employee-management.slice"
import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-[12px] uppercase text-muted-foreground">{label}</span>
      <span className="text-right text-[13px] text-foreground tabular-nums">{value ?? "—"}</span>
    </div>
  )
}

function eventTypeLabel(type: string) {
  return type.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

function DeviceBlock({ device }: { device: Record<string, unknown> | null }) {
  if (!device) {
    return <DetailRow label="Device" value="Not captured" />
  }

  const deviceClass =
    typeof device.deviceClass === "string" ? formatDeviceClass(device.deviceClass) : null
  const browser =
    typeof device.browser === "string"
      ? [device.browser, typeof device.browserVersion === "string" ? device.browserVersion : null]
          .filter(Boolean)
          .join(" ")
      : null
  const os = typeof device.os === "string" ? device.os : null

  return (
    <div className="pt-2">
      <span className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Device</span>
      <div className="mt-1 space-y-0.5">
        <div className="text-[13px] font-medium text-foreground">{formatDeviceSummary(device)}</div>
        {deviceClass ? <DetailRow label="Form factor" value={deviceClass} /> : null}
        {browser ? <DetailRow label="Browser" value={browser} /> : null}
        {os ? <DetailRow label="OS" value={os} /> : null}
      </div>
    </div>
  )
}

function ClockInEventCard({ event }: { event: AttendanceEventDetail }) {
  const location = event.location
  const device =
    event.deviceContext && typeof event.deviceContext === "object"
      ? event.deviceContext
      : null

  return (
    <div className="border border-border/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-foreground">{eventTypeLabel(event.eventType)}</span>
        <span className="text-[12px] text-muted-foreground">{event.eventSource}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <DetailRow label="Server time" value={formatDateTime(event.serverReceivedAt)} />
          <DetailRow
            label="Reported time"
            value={event.clientReportedAt ? formatDateTime(event.clientReportedAt) : "—"}
          />
          <DetailRow label="Timezone" value={event.clientTimezone ?? "—"} />
          <DetailRow label="IP address" value={event.ipAddress ?? "—"} />
          <DetailRow
            label="Location"
            value={
              location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : "Not captured"
            }
          />
          {location ? (
            <>
              <DetailRow
                label="Accuracy"
                value={
                  location.accuracyMeters != null ? `${location.accuracyMeters} m` : "—"
                }
              />
              <DetailRow label="Location permission" value={location.permissionState ?? "—"} />
              <DetailRow label="Location source" value={location.source ?? "—"} />
            </>
          ) : null}
          <DetailRow label="Geofence" value={event.geofenceResult ?? "Not evaluated"} />
          <DetailRow
            label="Work site"
            value={event.matchedWorkSiteId ? shortId(event.matchedWorkSiteId) : "—"}
          />
          <DeviceBlock device={device} />
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <span className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
              Map
            </span>
            <div className="mt-1">
              {location ? (
                <LocationMap
                  latitude={location.latitude}
                  longitude={location.longitude}
                  accuracyMeters={location.accuracyMeters}
                  className="h-48"
                />
              ) : (
                <div className="flex h-48 items-center justify-center border border-dashed border-border text-[13px] text-muted-foreground">
                  Location not captured
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
              Photo
            </span>
            <div className="mt-1">
              {event.photoUrl ? (
                <img
                  src={event.photoUrl}
                  alt="Clock evidence"
                  className="max-h-64 w-full rounded border border-border object-contain"
                />
              ) : (
                <div className="flex h-32 items-center justify-center border border-dashed border-border text-[13px] text-muted-foreground">
                  {event.cameraRequired ? "Photo required but missing" : "No photo captured"}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionSummary({ session }: { session: WorkSession }) {
  return (
    <div className="grid gap-x-8 sm:grid-cols-2">
      <DetailRow label="Status" value={session.status.replaceAll("_", " ")} />
      <DetailRow label="Review" value={session.reviewStatus.replaceAll("_", " ")} />
      <DetailRow label="Resolution" value={session.resolutionType.replaceAll("_", " ")} />
      <DetailRow
        label="Hours"
        value={
          session.actualClockOutAt
            ? formatDuration(session.actualClockInAt, session.actualClockOutAt)
            : "Open"
        }
      />
      <DetailRow
        label="Net minutes"
        value={session.netMinutes != null ? String(session.netMinutes) : "—"}
      />
      <DetailRow
        label="Break minutes"
        value={session.breakMinutes != null ? String(session.breakMinutes) : "—"}
      />
      <DetailRow label="Clock in" value={formatDateTime(session.actualClockInAt)} />
      <DetailRow
        label="Clock out"
        value={
          session.actualClockOutAt ? formatDateTime(session.actualClockOutAt) : "Open"
        }
      />
    </div>
  )
}

const ClockInDetailPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const dispatch = useAppDispatch()

  const detail = useAppSelector((s) => s.attendance.sessionDetail)
  const status = useAppSelector((s) => s.attendance.status.sessionDetail)
  const employees = useAppSelector((s) => s.employeeManagement.employees)

  const backTo = React.useMemo(
    () => ({
      pathname: "/scheduling/clock-ins",
      search: location.search,
    }),
    [location.search],
  )

  React.useEffect(() => {
    dispatch(fetchEmployees())
  }, [dispatch])

  React.useEffect(() => {
    if (!sessionId) return
    dispatch(fetchSessionDetail(sessionId))
    return () => {
      dispatch(clearSessionDetail())
    }
  }, [dispatch, sessionId])

  const session = detail?.session
  const employeeLabel = React.useMemo(() => {
    if (!session) return null
    const employee = employees.find((e) => e.membershipId === session.employeeMembershipId)
    if (employee) return employeeName(employee)
    return shortId(session.employeeMembershipId)
  }, [employees, session])

  const isLoading = status === "loading" || (status === "idle" && !detail && !!sessionId)
  const isError = status === "error"
  const notFound = status === "idle" && !session && !!sessionId && !isLoading

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 mb-2 h-8 px-2 text-muted-foreground"
                  asChild
                >
                  <Link to={backTo}>
                    <ArrowLeft className="size-4" />
                    Clock-ins
                  </Link>
                </Button>
                <div className="operations-label">Attendance</div>
                <PageHeader
                  title="Clock-in detail"
                  description={employeeLabel
                    ? `Capture detail for ${employeeLabel}`
                    : "Location, device, and policy flags for this work session."}
                  titleClassName="text-xl"
                  descriptionClassName="text-sm"
                />
              </div>
            </div>

            {isLoading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Loading capture detail…
              </p>
            ) : isError || notFound || !session || !detail ? (
              <div className="border border-border/70 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {isError
                    ? "Could not load this clock-in session."
                    : "Work session not found."}
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link to={backTo}>Back to clock-ins</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="border border-border/70 p-4">
                  <div className="mb-2 text-[13px] font-medium text-foreground">
                    {employeeLabel ?? shortId(session.employeeMembershipId)}
                  </div>
                  <SessionSummary session={session} />
                </div>

                {detail.events.length > 0 ? (
                  detail.events.map((event) => (
                    <ClockInEventCard key={event.id} event={event} />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No attendance events recorded for this session.
                  </p>
                )}

                {detail.exceptions.length > 0 ? (
                  <div className="border border-border/70 p-4">
                    <div className="mb-2 text-[13px] font-medium text-foreground">Exceptions</div>
                    <div className="space-y-2">
                      {detail.exceptions.map((exception) => (
                        <div
                          key={exception.id}
                          className="flex items-start justify-between gap-3 text-[13px]"
                        >
                          <span className="text-foreground">{exception.message}</span>
                          <span className="shrink-0 text-muted-foreground uppercase">
                            {exception.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex justify-start border-t border-border pt-4">
                  <Button variant="outline" asChild>
                    <Link to={backTo}>
                      <ArrowLeft className="size-4" />
                      Back to clock-ins
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default ClockInDetailPage
