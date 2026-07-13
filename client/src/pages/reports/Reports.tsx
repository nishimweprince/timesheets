"use client"

import * as React from "react"
import { DownloadIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import DatePicker from "@/components/reusable/inputs/DatePicker"
import Select from "@/components/reusable/inputs/Select"
import { DataTable } from "@/components/reusable/tables"
import { PageHeader } from "@/components/reusable/layout"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import type { ReportsTab } from "./reports.constants"
import { useReports } from "./useReports"
import { ReportsExportModal } from "./components/reports/ReportsExportModal"
import { ReportsSummaryCard } from "./components/reports/ReportsSummaryCard"

const Reports = ({ tab = "hours" }: { tab?: ReportsTab }) => {
  const r = useReports(tab)

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
            <div className="flex flex-col gap-1 border-b border-border/60 pb-4">
              <p className="text-sm text-muted-foreground">Analytics</p>
              <PageHeader title="Reports" titleClassName="text-[13px]" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {r.summaryCards.map((card) => (
                <ReportsSummaryCard key={card.label} {...card} />
              ))}
            </div>

            <div className="flex flex-col gap-3 border-b border-border sm:flex-row sm:items-end sm:justify-end">
              <div className="flex flex-wrap items-end gap-2 pb-3 sm:pb-2">
                {r.activeTab === "exceptions" ? (
                  <>
                    <Select
                      value={r.severity}
                      options={r.severityOptions}
                      onChange={(value) => r.setSeverity(value)}
                      className="w-48"
                    />
                    <Select
                      value={r.exceptionStatus}
                      options={r.statusOptions}
                      onChange={(value) => r.setExceptionStatus(value)}
                      className="w-48"
                    />
                  </>
                ) : (
                  <div className="w-48">
                    <DatePicker
                      value={r.hoursDay}
                      onChange={r.onHoursDayChange}
                      placeholder="Select day"
                    />
                  </div>
                )}
                <Button type="button" variant="outline" onClick={r.openReportModal}>
                  <DownloadIcon className="size-4" />
                  Generate report
                </Button>
              </div>
            </div>

            <ReportsExportModal
              isOpen={r.reportModalOpen}
              onClose={r.closeReportModal}
              startDate={r.reportStartDate}
              onStartDateChange={r.setReportStartDate}
              endDate={r.reportEndDate}
              onEndDateChange={r.setReportEndDate}
              isGenerating={r.isGeneratingReport}
              onGenerate={r.generateReport}
            />

            {r.activeTab === "hours" ? (
              <DataTable
                eyebrow="Hours"
                title="Hours by employee"
                description={`Aggregated net, gross, and break hours per employee for ${r.hoursDayLabel}.`}
                columns={r.hoursColumns}
                data={r.hoursPage.data}
                tableClassName="min-w-[900px]"
                getRowId={(row) => row.membershipId}
                pagination={r.hoursPagination}
                paginationInfo={r.hoursPage}
                onPaginationChange={r.setHoursPagination}
                rowCount={r.hoursPage.total}
                pageSizeOptions={[10, 25, 50]}
                syncPaginationFromInfo
                isLoading={r.status.hoursByEmployee === "loading" && r.hoursPage.data.length === 0}
                isFetching={r.status.hoursByEmployee === "loading" && r.hoursPage.data.length > 0}
                emptyTitle="No attendance on selected day"
                emptyDescription="Select a different day to see hours worked per employee."
              />
            ) : (
              <DataTable
                eyebrow="Exceptions"
                title="Attendance exceptions"
                description="Policy exceptions flagged on work sessions for the selected filters."
                columns={r.exceptionColumns}
                data={r.exceptionsPage.data}
                tableClassName="min-w-[980px]"
                getRowId={(row) => row.id}
                pagination={r.exceptionsPagination}
                paginationInfo={r.exceptionsPage}
                onPaginationChange={r.setExceptionsPagination}
                rowCount={r.exceptionsPage.total}
                pageSizeOptions={[10, 25, 50]}
                syncPaginationFromInfo
                isLoading={r.status.exceptions === "loading" && r.exceptionsPage.data.length === 0}
                isFetching={r.status.exceptions === "loading" && r.exceptionsPage.data.length > 0}
                emptyTitle="No exceptions in range"
                emptyDescription="No policy exceptions were logged for the selected filters."
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Reports
