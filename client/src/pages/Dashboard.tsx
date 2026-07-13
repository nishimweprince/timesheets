"use client"

import * as React from "react"
import { FileTextIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/reusable/tables"
import { CameraModal } from "@/components/reusable/cards/CameraModal"
import { PageHeader } from "@/components/reusable/layout"

import { useDashboard } from "./dashboard/useDashboard"
import { recentEntryColumns } from "./dashboard/dashboard.columns"
import { DutyStrip } from "./dashboard/components/DutyStrip"
import { AttentionStrip } from "./dashboard/components/AttentionStrip"
import { EmployeeToday } from "./dashboard/components/EmployeeToday"
import { AdminTiles } from "./dashboard/components/AdminTiles"
import { WeekChart } from "./dashboard/components/WeekChart"

const Dashboard = () => {
  const d = useDashboard()

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
            <div className="operations-page-header">
              <div>
                <div className="operations-label">
                  {d.canUseEmployeeAttendance ? "My shift desk" : "Command center"}
                </div>
                <PageHeader
                  title={d.greeting}
                  description={d.canUseEmployeeAttendance
                    ? "Clock in, check your next shift, and review recent hours."
                    : "See what needs attention, then jump into review, coverage, or team work."}
                  titleClassName="text-xl"
                  descriptionClassName="text-sm"
                />
              </div>
            </div>

            {/* Employee duty strip */}
            {d.canUseEmployeeAttendance && (
              <DutyStrip
                isOnShift={d.isOnShift}
                currentSession={d.currentSession}
                dutySubtitle={d.dutySubtitle}
                nowMs={d.nowMs}
                actionLoading={d.actionLoading}
                clockInLoading={d.clockInLoading}
                clockOutLoading={d.clockOutLoading}
                onClockButton={d.handleClockButton}
              />
            )}

            {d.canUseEmployeeAttendance && (
              <CameraModal
                isOpen={d.cameraModalOpen}
                onClose={() => {
                  d.setCameraModalOpen(false)
                  d.setPendingAction(null)
                }}
                heading={
                  d.pendingAction === "in"
                    ? "Photo required to clock in"
                    : "Photo required to clock out"
                }
                onCapture={(mediaAssetId) => {
                  d.setCameraModalOpen(false)
                  if (d.pendingAction === "in") d.handleClockIn(mediaAssetId)
                  else d.handleClockOut(mediaAssetId)
                  d.setPendingAction(null)
                }}
              />
            )}

            {/* Admin attention strip */}
            {d.isAdminHome && (d.canReadOrgAttendance || d.canManageShifts) && (
              <AttentionStrip
                pendingReviewCount={d.pendingReviewCount}
                openExceptionCount={d.openExceptionCount}
                teamOnDuty={d.teamOnDuty}
              />
            )}

            {/* Employee today / next shift */}
            {d.canUseEmployeeAttendance && (
              <EmployeeToday
                todayHours={d.todayHours}
                weekHours={d.weekHours}
                isOnShift={d.isOnShift}
                nextShift={d.nextShift}
              />
            )}

            {/* Admin action tiles */}
            {d.isAdminHome && d.adminTiles.length > 0 && <AdminTiles tiles={d.adminTiles} />}

            {/* Employee week chart */}
            {d.canUseEmployeeAttendance && <WeekChart weeklyData={d.weeklyData} />}

            {/* Employee recent entries */}
            {d.canUseEmployeeAttendance && (
              <DataTable
                eyebrow="Recent"
                title="Recent entries"
                columns={recentEntryColumns}
                data={d.recentEntries}
                getRowId={(entry) => entry.id}
                pagination={d.recentPagination}
                paginationInfo={d.history}
                onPaginationChange={d.setRecentPagination}
                rowCount={d.history.total}
                pageSizeOptions={[4, 8, 12]}
                isLoading={d.isRecentLoading}
                isFetching={d.isRecentFetching}
                emptyTitle="No recent entries"
                emptyDescription="Clock in to start a new timesheet entry."
                actions={
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/timesheets">
                      <FileTextIcon className="size-3.5" />
                      View all
                    </Link>
                  </Button>
                }
              />
            )}

            {/* Admin-only empty: pure employee already has content; pure admin without org read */}
            {!d.canUseEmployeeAttendance && !d.isAdminHome && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Welcome</CardTitle>
                  <CardDescription>
                    Your account does not have attendance or operations permissions yet. Contact
                    your organization admin.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Dashboard
