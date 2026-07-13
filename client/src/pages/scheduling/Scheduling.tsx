"use client"

import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import ConfirmationModal from "@/components/reusable/cards/ConfirmationModal"
import DatePicker from "@/components/reusable/inputs/DatePicker"
import { DataTable } from "@/components/reusable/tables"
import { PageHeader } from "@/components/reusable/layout"

import type { SchedulingView } from "./scheduling.constants"
import { useScheduling } from "./useScheduling"
import { MetricTile } from "./components/MetricTile"
import { CoverageLedger } from "./components/CoverageLedger"
import { CalendarTab } from "./components/CalendarTab"
import { NewShiftDialog } from "./components/NewShiftDialog"
import { AssignEmployeeDialog } from "./components/AssignEmployeeDialog"
import { ShiftDetailsDialog } from "./components/ShiftDetailsDialog"

const Scheduling = ({ view = "coverage" }: { view?: SchedulingView }) => {
  const s = useScheduling(view)

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
                <div className="operations-label">Admin command center</div>
                <PageHeader
                  title="Scheduling coverage"
                  description="Scan staffing gaps and shift coverage. Review attendance under Reports → Review."
                  titleClassName="text-xl"
                  descriptionClassName="text-sm"
                />
              </div>
            </div>

            {view === "coverage" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {s.coverageMetrics.map((metric) => (
                    <MetricTile key={metric.label} {...metric} />
                  ))}
                </div>

                <CoverageLedger
                  instances={s.instances}
                  patternAssignments={s.patternAssignments}
                  rangeStart={s.calendarRange.from}
                />

                <div className="min-w-0">
                  <CalendarTab
                    instances={s.instances}
                    patterns={s.patterns}
                    patternAssignments={s.patternAssignments}
                    onRangeChange={s.handleCalendarRangeChange}
                    onSelectInstance={s.setOverrideTarget}
                    includeCancelled={s.includeCancelled}
                    includeCompleted={s.includeCompleted}
                    onToggleCancelled={s.setIncludeCancelled}
                    onToggleCompleted={s.setIncludeCompleted}
                  />
                </div>
              </>
            )}

            {view === "clock-ins" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <div className="operations-label">Attendance</div>
                    <h2 className="text-base font-medium text-foreground">Clock-ins for the day</h2>
                  </div>
                  <div className="w-56">
                    <DatePicker
                      value={s.clockInDay}
                      onChange={(date) => {
                        if (date) s.setClockInDay(date)
                      }}
                      placeholder="Select day"
                    />
                  </div>
                </div>

                <DataTable
                  eyebrow="Attendance"
                  title="Clock-ins"
                  description="Every clock-in recorded on the selected day. Open a row for the full capture detail."
                  columns={s.clockInColumns}
                  data={s.dayClockIns}
                  tableClassName="min-w-[820px]"
                  getRowId={(session) => session.id}
                  onRowClick={(row) => s.openSessionDetail(row.original)}
                  hidePagination
                  isLoading={s.statusDayClockIns === "loading" && s.dayClockIns.length === 0}
                  isFetching={s.statusDayClockIns === "loading" && s.dayClockIns.length > 0}
                  emptyTitle="No clock-ins"
                  emptyDescription="No one clocked in on the selected day."
                />
              </>
            )}

            {(view === "shifts" || view === "assignments") && (
              <>
                <div className="flex flex-wrap items-center justify-end gap-3 border-b border-border pb-2">
                  <div className="flex gap-2">
                    <NewShiftDialog onCreated={s.onNewShiftCreated} />
                    <AssignEmployeeDialog onCreated={s.onAssignmentCreated} />
                  </div>
                </div>

                {view === "shifts" && (
                  <DataTable
                    eyebrow="Setup"
                    title="Generated shifts"
                    columns={s.instanceColumns}
                    data={s.instancesPage.data}
                    tableClassName="min-w-[820px]"
                    getRowId={(i) => i.id}
                    pagination={s.pagination}
                    paginationInfo={{
                      page: s.instancesPage.page,
                      pageSize: s.instancesPage.pageSize || s.pagination.pageSize,
                      total: s.instancesPage.total,
                    }}
                    onPaginationChange={s.setPagination}
                    rowCount={s.instancesPage.total}
                    pageSizeOptions={[8, 16, 32]}
                    syncPaginationFromInfo
                    isLoading={s.isLoadingCurrent}
                    isFetching={s.isFetchingCurrent}
                    emptyTitle="No generated shifts"
                    emptyDescription="Create a pattern to generate shifts for your team."
                  />
                )}

                {view === "assignments" && (
                  <DataTable
                    eyebrow="Setup"
                    title="Pattern assignments"
                    columns={s.assignmentColumns}
                    data={s.patternAssignmentsPage.data}
                    tableClassName="min-w-[760px]"
                    getRowId={(a) => a.id}
                    pagination={s.pagination}
                    paginationInfo={{
                      page: s.patternAssignmentsPage.page,
                      pageSize: s.patternAssignmentsPage.pageSize || s.pagination.pageSize,
                      total: s.patternAssignmentsPage.total,
                    }}
                    onPaginationChange={s.setPagination}
                    rowCount={s.patternAssignmentsPage.total}
                    pageSizeOptions={[8, 16, 32]}
                    syncPaginationFromInfo
                    isLoading={s.isLoadingCurrent}
                    isFetching={s.isFetchingCurrent}
                    emptyTitle="No assignments yet"
                    emptyDescription="Assign employees to shift patterns to start covering the schedule."
                  />
                )}
              </>
            )}

            <ShiftDetailsDialog
              instance={s.overrideTarget}
              patterns={s.patterns}
              patternAssignments={s.patternAssignments}
              open={s.overrideTarget !== null}
              blockDismiss={s.cancelInstanceConfirm.isOpen}
              onOpenChange={(o) => {
                if (!o) s.setOverrideTarget(null)
              }}
              onDone={() => {
                s.refreshInstances()
                s.setOverrideTarget(null)
              }}
            />

            <ConfirmationModal
              isOpen={s.cancelInstanceConfirm.isOpen}
              onClose={s.closeCancelConfirm}
              onConfirm={s.handleConfirmCancelInstance}
              isLoading={s.isCancellingInstance}
              heading="Cancel shift"
              description="Cancel this shift? Employees assigned to it will no longer be scheduled."
              confirmLabel="Cancel shift"
            />

            <ConfirmationModal
              isOpen={s.removeAssignmentConfirm.isOpen}
              onClose={s.closeRemoveConfirm}
              onConfirm={s.handleConfirmRemoveAssignment}
              isLoading={s.isRemovingAssignment}
              heading="Remove assignment"
              description="Remove this employee from the shift pattern? They will no longer be assigned to its shifts."
              confirmLabel="Remove assignment"
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Scheduling
