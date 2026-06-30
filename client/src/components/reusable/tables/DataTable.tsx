"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type Table as TanStackTable,
} from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/* eslint-disable @typescript-eslint/no-unused-vars */
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    align?: "left" | "center" | "right"
    className?: string
    headerClassName?: string
    cellClassName?: string
    width?: string
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

type DataTablePagination = {
  pageIndex: number
  pageSize: number
}

type DataTablePaginationLabels = {
  rowsPerPage?: string
  page?: string
  of?: string
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  title?: React.ReactNode
  description?: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
  tableClassName?: string
  headerClassName?: string
  rowClassName?: string | ((row: Row<TData>) => string | undefined)
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string
  onRowClick?: (row: Row<TData>) => void
  isLoading?: boolean
  isFetching?: boolean
  loadingRowCount?: number
  emptyTitle?: React.ReactNode
  emptyDescription?: React.ReactNode
  emptyAction?: React.ReactNode
  pagination?: DataTablePagination
  onPaginationChange?: OnChangeFn<PaginationState>
  rowCount?: number
  pageCount?: number
  pageSizeOptions?: number[]
  paginationLabels?: DataTablePaginationLabels
  manualPagination?: boolean
  hidePagination?: boolean
}

const alignmentClassNames = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

function resolveUpdater<TValue>(
  updaterOrValue: TValue | ((old: TValue) => TValue),
  previousValue: TValue,
) {
  return typeof updaterOrValue === "function"
    ? (updaterOrValue as (old: TValue) => TValue)(previousValue)
    : updaterOrValue
}

function DataTable<TData, TValue>({
  columns,
  data,
  title,
  description,
  eyebrow,
  actions,
  toolbar,
  footer,
  className,
  contentClassName,
  tableClassName,
  headerClassName,
  rowClassName,
  getRowId,
  onRowClick,
  isLoading = false,
  isFetching = false,
  loadingRowCount,
  emptyTitle = "No records found",
  emptyDescription,
  emptyAction,
  pagination,
  onPaginationChange,
  rowCount,
  pageCount,
  pageSizeOptions = [10, 20, 50],
  paginationLabels,
  manualPagination = Boolean(pagination && onPaginationChange),
  hidePagination = false,
}: DataTableProps<TData, TValue>) {
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({
      pageIndex: 0,
      pageSize: pageSizeOptions[0] ?? 10,
    })

  const controlledPagination = pagination
    ? {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      }
    : internalPagination

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    if (onPaginationChange) {
      onPaginationChange(updater)
      return
    }

    setInternalPagination((previous) => resolveUpdater(updater, previous))
  }

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      pagination: controlledPagination,
    },
    getRowId,
    manualPagination,
    rowCount,
    pageCount,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
  })

  const rows = table.getRowModel().rows
  const visibleColumns = table.getVisibleLeafColumns()
  const columnCount = Math.max(visibleColumns.length, 1)
  const shouldShowPagination = !hidePagination && (pagination || rowCount || pageCount)
  const shouldShowChrome = Boolean(
    title || description || eyebrow || actions || toolbar || shouldShowPagination || footer,
  )

  return (
    <Card className={cn("overflow-hidden", className)}>
      {title || description || eyebrow || actions || toolbar ? (
        <CardHeader className={cn("gap-3 pb-3", headerClassName)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              {eyebrow ? (
                <div className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  {eyebrow}
                </div>
              ) : null}
              {title ? (
                <CardTitle className="text-base font-medium tracking-tight">
                  {title}
                </CardTitle>
              ) : null}
              {description ? (
                <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </CardHeader>
      ) : null}

      <CardContent
        className={cn(
          "p-0",
          shouldShowChrome ? "border-t border-border/70" : null,
          contentClassName,
        )}
      >
        <div className="relative overflow-x-auto">
          {isFetching && !isLoading ? (
            <div className="absolute inset-x-0 top-0 z-10 h-px bg-primary/70" />
          ) : null}

          <table className={cn("w-full min-w-[680px] table-fixed text-sm", tableClassName)}>
            <thead className="bg-muted/35">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border/70">
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta

                    return (
                      <th
                        key={header.id}
                        style={{ width: meta?.width }}
                        className={cn(
                          "h-10 px-3 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase",
                          alignmentClassNames[meta?.align ?? "left"],
                          meta?.className,
                          meta?.headerClassName,
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRows
                  columnCount={columnCount}
                  rowCount={loadingRowCount ?? Math.min(controlledPagination.pageSize, 8)}
                />
              ) : rows.length ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault()
                              onRowClick(row)
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "group border-b border-border/60 transition-colors last:border-b-0",
                      onRowClick
                        ? "cursor-pointer outline-none hover:bg-muted/35 focus-visible:bg-muted/45 focus-visible:ring-1 focus-visible:ring-ring/40"
                        : "hover:bg-muted/25",
                      typeof rowClassName === "function" ? rowClassName(row) : rowClassName,
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta

                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "h-12 px-3 align-middle text-foreground",
                            alignmentClassNames[meta?.align ?? "left"],
                            meta?.className,
                            meta?.cellClassName,
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      )
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-12 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <div className="text-sm font-medium text-foreground">{emptyTitle}</div>
                      {emptyDescription ? (
                        <div className="text-sm text-muted-foreground">{emptyDescription}</div>
                      ) : null}
                      {emptyAction ? <div className="pt-2">{emptyAction}</div> : null}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {footer || shouldShowPagination ? (
          <div className="flex flex-col gap-3 border-t border-border/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : <div />}
            {shouldShowPagination ? (
              <DataTablePagination
                table={table}
                labels={paginationLabels}
                isFetching={isFetching}
                pageSizeOptions={pageSizeOptions}
              />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function LoadingRows({
  columnCount,
  rowCount,
}: {
  columnCount: number
  rowCount: number
}) {
  return Array.from({ length: rowCount }).map((_, rowIndex) => (
    <tr key={rowIndex} className="border-b border-border/60 last:border-b-0">
      {Array.from({ length: columnCount }).map((__, columnIndex) => (
        <td key={columnIndex} className="h-12 px-3 align-middle">
          <Skeleton
            className={cn(
              "h-3.5",
              columnIndex === 0 ? "w-24" : null,
              columnIndex === columnCount - 1 ? "ml-auto w-16" : "w-28",
            )}
          />
        </td>
      ))}
    </tr>
  ))
}

function DataTablePagination<TData>({
  table,
  labels,
  isFetching,
  pageSizeOptions,
}: {
  table: TanStackTable<TData>
  labels?: DataTablePaginationLabels
  isFetching?: boolean
  pageSizeOptions: number[]
}) {
  const rowCount = table.getRowCount()
  const pagination = table.getState().pagination
  const firstRow = rowCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const lastRow = Math.min(rowCount, (pagination.pageIndex + 1) * pagination.pageSize)
  const pageCount = table.getPageCount()
  const displayPageCount = pageCount === -1 ? "many" : pageCount

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isFetching ? <Loader2 className="size-3 animate-spin" aria-hidden="true" /> : null}
        <span className="tabular-nums text-[12px]">
          {firstRow}-{lastRow} of {rowCount}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-[12px]">{labels?.rowsPerPage ?? "Rows"}</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger
              size="sm"
              className="h-7 w-16 border-field-border bg-field text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-0 w-16 max-w-16">
              {pageSizeOptions.map((pageSize) => (
                <SelectItem className="text-[12px] cursor-pointer" key={pageSize} value={String(pageSize)}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
     
        </label>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="tabular-nums text-[12px]">
            {labels?.page ?? "Page"} {pagination.pageIndex + 1} {labels?.of ?? "of"}{" "}
            {displayPageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 p-1"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
          >
            <ChevronsLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 p-1"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 p-1"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 p-1"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage() || pageCount === -1}
            aria-label="Last page"
          >
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

export { DataTable }
export type { DataTablePagination, DataTableProps }
