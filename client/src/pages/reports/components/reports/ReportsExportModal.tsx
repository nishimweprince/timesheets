import Modal from "@/components/reusable/cards/Modal"
import DatePicker from "@/components/reusable/inputs/DatePicker"
import { Button } from "@/components/ui/button"
import { DownloadIcon } from "lucide-react"

/** Date-range picker modal that triggers the PDF export for the active report. */
export function ReportsExportModal({
  isOpen,
  onClose,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  isGenerating,
  onGenerate,
}: {
  isOpen: boolean
  onClose: () => void
  startDate: Date | undefined
  onStartDateChange: (date: Date | undefined) => void
  endDate: Date | undefined
  onEndDateChange: (date: Date | undefined) => void
  isGenerating: boolean
  onGenerate: () => void
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      heading="Generate report"
      className="!min-w-0 w-[min(92vw,34rem)] rounded-xs"
      headingClassName="text-base normal-case tracking-tight text-foreground"
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Start date
            </span>
            <DatePicker
              value={startDate}
              onChange={onStartDateChange}
              placeholder="Start date"
              toDate={endDate}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              End date
            </span>
            <DatePicker
              value={endDate}
              onChange={onEndDateChange}
              placeholder="End date"
              fromDate={startDate}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-xs"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xs"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            <DownloadIcon className="size-4" />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
