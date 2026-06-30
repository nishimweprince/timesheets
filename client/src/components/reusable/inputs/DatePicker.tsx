import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Select from './Select'

type DatePickerProps = {
  value: Date | string | undefined
  onChange: (date: Date | undefined) => void
  selectionType?: 'date' | 'month' | 'year' | 'recurringDate'
  fromDate?: Date
  placeholder?: string
  toDate?: Date
  disabled?: boolean
}

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fullMonthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DatePicker = ({
  onChange,
  value,
  selectionType = 'date',
  fromDate,
  placeholder = 'Select date',
  toDate,
  disabled = false,
}: DatePickerProps) => {
  const selectedDate = useMemo(() => normalizeDate(value), [value])
  const initialMonth = selectedDate ?? fromDate ?? new Date()
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  )

  const yearOptions = useMemo(() => {
    const minYear = fromDate?.getFullYear() ?? 1900
    const maxYear = toDate?.getFullYear() ?? 2199
    return Array.from({ length: maxYear - minYear + 1 }, (_, index) => {
      const year = String(maxYear - index)
      return { value: year, label: year }
    })
  }, [fromDate, toDate])

  const days = useMemo(() => calendarDays(viewDate), [viewDate])
  const buttonLabel = selectedDate
    ? selectionType === 'recurringDate'
      ? selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
      : selectedDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
    : placeholder

  const changeMonth = (offset: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const selectDate = (date: Date) => {
    if (isOutOfRange(date, fromDate, toDate)) return
    onChange(date)
    setOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-start rounded-none border-field-border bg-field px-3 text-left text-sm font-normal hover:bg-field-hover focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30',
            !selectedDate && 'text-placeholder',
          )}
        >
          <CalendarDays className="mr-2 size-4 text-muted-foreground" />
          {buttonLabel}
        </Button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-72 rounded-none border border-field-border bg-popover p-3 text-popover-foreground shadow-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <Select
                value={String(viewDate.getFullYear())}
                options={yearOptions}
                onChange={(year) =>
                  setViewDate((current) => new Date(Number(year), current.getMonth(), 1))
                }
                className="h-8 px-2 text-sm"
              />
              <Select
                value={String(viewDate.getMonth())}
                options={monthLabels.map((label, index) => ({
                  value: String(index),
                  label,
                }))}
                onChange={(month) =>
                  setViewDate((current) => new Date(current.getFullYear(), Number(month), 1))
                }
                className="h-8 px-2 text-sm"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px text-center text-[11px] text-muted-foreground">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <span key={`${day}-${index}`} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-px">
            {days.map((date, index) => {
              const currentMonth = date.getMonth() === viewDate.getMonth()
              const selected = selectedDate && isSameDay(date, selectedDate)
              const disabledDay = isOutOfRange(date, fromDate, toDate)

              return (
                <button
                  key={`${date.toISOString()}-${index}`}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => selectDate(date)}
                  className={cn(
                    'h-8 rounded-none text-sm outline-none transition-colors hover:bg-muted focus:bg-muted focus:ring-1 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-30',
                    !currentMonth && 'text-muted-foreground/50',
                    selected && 'bg-primary text-primary-foreground hover:bg-primary',
                  )}
                  aria-label={`${fullMonthLabels[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

function normalizeDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function calendarDays(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const firstDay = start.getDay()
  const cursor = new Date(start)
  cursor.setDate(cursor.getDate() - firstDay)

  return Array.from({ length: 42 }, () => {
    const date = new Date(cursor)
    cursor.setDate(cursor.getDate() + 1)
    return date
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isOutOfRange(date: Date, fromDate?: Date, toDate?: Date): boolean {
  const day = startOfDay(date).getTime()
  if (fromDate && day < startOfDay(fromDate).getTime()) return true
  if (toDate && day > startOfDay(toDate).getTime()) return true
  return false
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export default DatePicker
