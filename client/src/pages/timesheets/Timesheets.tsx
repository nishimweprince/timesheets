"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/reusable/tables"
import { CameraModal } from "@/components/reusable/cards/CameraModal"

import { useTimesheets } from "./useTimesheets"
import { timesheetColumns } from "./timesheets.columns"
import { ClockInCard } from "./components/ClockInCard"
import { MyShiftsCard } from "./components/MyShiftsCard"
import { MyShiftCalendar } from "./components/MyShiftCalendar"
import { ShiftDetailsModal } from "./components/ShiftDetailsModal"
import { SummaryCards } from "./components/SummaryCards"

const Timesheets = () => {
  const t = useTimesheets()

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
            {/* Clock In / Out */}
            {t.canClockInOut && (
              <ClockInCard
                isOnShift={t.isOnShift}
                currentShiftLabel={t.currentShiftLabel}
                readinessItems={t.readinessItems}
                nextShift={t.nextShift}
                onStartBreak={t.handleStartBreak}
                onEndBreak={t.handleEndBreak}
                breakLoading={t.breakLoading}
                onClockButton={t.handleClockButton}
                actionLoading={t.actionLoading}
                clockInLoading={t.clockInLoading}
                clockOutLoading={t.clockOutLoading}
              />
            )}

            <CameraModal
              isOpen={t.cameraModalOpen}
              onClose={t.closeCameraModal}
              heading={t.pendingAction === 'in' ? 'Photo required to clock in' : 'Photo required to clock out'}
              onCapture={t.handleCameraCapture}
            />

            {/* My shifts */}
            {t.canViewShifts && (
              <>
                <MyShiftsCard
                  nextShift={t.nextShift}
                  laterShifts={t.laterShifts}
                  areShiftsLoading={t.areShiftsLoading}
                  onSelectShift={t.setSelectedShift}
                />

                <MyShiftCalendar
                  shifts={t.myUpcomingShifts}
                  onRangeChange={t.handleMyShiftCalendarRangeChange}
                  onSelectShift={t.setSelectedShift}
                />
              </>
            )}

            <ShiftDetailsModal
              shift={t.selectedShift}
              onClose={() => t.setSelectedShift(null)}
              canClockInOut={t.canClockInOut}
              isOnShift={t.isOnShift}
              onClockButton={t.handleClockButton}
              actionLoading={t.actionLoading}
              clockInLoading={t.clockInLoading}
            />

            {/* Summary cards */}
            <SummaryCards cards={t.summaryCards} />

            {/* History table */}
            <DataTable
              eyebrow="Attendance"
              title="My timesheets"
              columns={timesheetColumns}
              data={t.entries}
              getRowId={(entry) => entry.id}
              pagination={t.pagination}
              paginationInfo={t.history}
              onPaginationChange={t.setPagination}
              rowCount={t.history.total}
              pageSizeOptions={[8, 16, 32]}
              syncPaginationFromInfo
              isLoading={t.isLoading}
              isFetching={t.isFetching}
              emptyTitle="No timesheet entries"
              emptyDescription="Clock in to start recording your attendance."
              toolbar={
                <Select
                  value={t.statusFilter}
                  onValueChange={t.handleStatusFilterChange}
                >
                  <SelectTrigger className="h-11 w-48 text-sm">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All statuses</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Timesheets
