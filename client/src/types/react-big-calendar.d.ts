declare module "react-big-calendar" {
  import type * as React from "react"

  export type View = "month" | "week" | "work_week" | "day" | "agenda"
  export const Views: Record<string, View>
  export function momentLocalizer(moment: unknown): unknown

  export interface EventProps<TEvent> {
    event: TEvent
    title: React.ReactNode
  }

  export interface CalendarProps<TEvent extends object = object> {
    localizer: unknown
    events: TEvent[]
    startAccessor: keyof TEvent | ((event: TEvent) => Date)
    endAccessor: keyof TEvent | ((event: TEvent) => Date)
    titleAccessor?: keyof TEvent | ((event: TEvent) => string)
    views?: View[]
    defaultView?: View
    view?: View
    onView?: (view: View) => void
    date?: Date
    onNavigate?: (date: Date) => void
    onRangeChange?: (range: Date[] | { start: Date; end: Date }, view?: View) => void
    onSelectEvent?: (event: TEvent) => void
    popup?: boolean
    style?: React.CSSProperties
    components?: { event?: React.ComponentType<EventProps<TEvent>> }
    eventPropGetter?: (event: TEvent) => { className?: string; style?: React.CSSProperties }
  }

  export class Calendar<TEvent extends object = object> extends React.Component<CalendarProps<TEvent>> {}
}

declare module "react-big-calendar/lib/css/react-big-calendar.css";
