"use client"

import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  AlertTriangleIcon,
  BarChart3Icon,
  CalendarClockIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  HomeIcon,
  LayoutGridIcon,
  LogInIcon,
  MapPinIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  UsersRoundIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAppSelector } from "@/states/store/hooks.state"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import logo from "/logo.png"

type SubNavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  items?: SubNavItem[]
}

const mainNav: NavItem[] = [
  { title: "Overview", url: "/dashboard", icon: HomeIcon },
  { title: "My Timesheets", url: "/timesheets", icon: FileTextIcon },
]

const operationsNav: NavItem[] = [
  {
    title: "Schedule",
    url: "/scheduling",
    icon: CalendarIcon,
    items: [
      { title: "Coverage", url: "/scheduling", icon: LayoutGridIcon },
      { title: "Clock-ins", url: "/scheduling/clock-ins", icon: LogInIcon },
      { title: "Generated Shifts", url: "/scheduling/shifts", icon: CalendarClockIcon },
      { title: "Pattern Assignments", url: "/scheduling/assignments", icon: ClipboardListIcon },
    ],
  },
  {
    title: "Policies",
    url: "/policies",
    icon: ShieldCheckIcon,
    items: [
      { title: "Manage Policies", url: "/policies", icon: ScrollTextIcon },
      { title: "Work Sites", url: "/policies/work-sites", icon: MapPinIcon },
    ],
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3Icon,
    items: [
      { title: "Hours", url: "/reports", icon: ClockIcon },
      { title: "Exceptions", url: "/reports/exceptions", icon: AlertTriangleIcon },
    ],
  },
  {
    title: "Team",
    url: "/team",
    icon: UsersIcon,
    items: [
      { title: "Employees", url: "/team", icon: UserIcon },
      { title: "Teams", url: "/team/teams", icon: UsersRoundIcon },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const employeeCount = useAppSelector((state) => state.employeeManagement.employees.length)
  const permissions = useAppSelector((state) => state.auth.user?.permissions ?? [])
  const roleNames = useAppSelector((state) => state.auth.user?.roleNames ?? [])
  const canReadEmployees = permissions.includes("employee.read")
  const canManageShifts = permissions.includes("shift.create")
  const isSuperAdmin = roleNames.includes("Organization Admin")
  const canReadReports = permissions.includes("report.read")

  const visibleMainNav = mainNav.filter((item) => {
    if (item.title === "My Timesheets") return !isSuperAdmin
    return true
  })

  const visibleOperationsNav = operationsNav
    .filter((item) => {
      if (item.title === "Team") return canReadEmployees
      if (item.title === "Schedule") return canManageShifts
      if (item.title === "Policies") return isSuperAdmin
      if (item.title === "Reports") return canReadReports
      return true
    })
    .map((item) =>
      item.title === "Team" && employeeCount > 0
        ? { ...item, badge: String(employeeCount) }
        : item,
    )

  const menuButtonClassName = cn(
    "relative h-11 gap-3 rounded-xs px-4 text-[13px] font-medium text-sidebar-foreground/76",
    "transition-[background-color,color,box-shadow] duration-150",
    "hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
    "focus-visible:ring-1 focus-visible:ring-sidebar-ring/60",
    "before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-transparent before:content-[''] before:transition-colors",
    "after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-sidebar-border/45 after:content-['']",
    "data-[active=true]:bg-sidebar-accent/70 data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--sidebar-primary)_18%,transparent)] data-[active=true]:before:bg-sidebar-primary",
  )

  const renderNavLabel = (Icon: NavItem["icon"], title: string) => (
    <>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center border border-sidebar-border/60 bg-sidebar/70 text-sidebar-foreground/55 transition-colors",
          "group-hover/menu-button:border-sidebar-border group-hover/menu-button:text-sidebar-foreground/75",
          "group-data-[active=true]/menu-button:border-sidebar-primary/30 group-data-[active=true]/menu-button:bg-sidebar-primary/10 group-data-[active=true]/menu-button:text-sidebar-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="tracking-normal leading-5">{title}</span>
    </>
  )

  const badgeClassName =
    "right-4 top-3 h-5 min-w-5 border border-sidebar-border/60 bg-sidebar px-1.5 text-[13px] font-normal text-sidebar-foreground/60 tabular-nums peer-data-active/menu-button:border-sidebar-primary/30 peer-data-active/menu-button:bg-sidebar-primary/10 peer-data-active/menu-button:text-sidebar-primary"

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      const Icon = item.icon

      if (item.items && item.items.length > 0) {
        const sectionActive =
          pathname === item.url || pathname.startsWith(`${item.url}/`)

        return (
          <Collapsible key={item.title} asChild defaultOpen={sectionActive} className="group/collapsible">
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={sectionActive}
                  className={menuButtonClassName}
                >
                  {renderNavLabel(Icon, item.title)}
                  <ChevronRightIcon className="ml-auto size-4 shrink-0 text-sidebar-foreground/45 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>

              {item.badge && (
                <SidebarMenuBadge className={badgeClassName}>{item.badge}</SidebarMenuBadge>
              )}

              <CollapsibleContent>
                <SidebarMenuSub className="mx-4 gap-1 border-l-sidebar-border/70 px-3 py-1.5">
                  {item.items.map((subItem) => {
                    const SubIcon = subItem.icon
                    return (
                      <SidebarMenuSubItem key={subItem.url}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === subItem.url}
                          className="h-9 gap-2.5 rounded-xs px-3 text-[13px] text-sidebar-foreground/72 data-[size=md]:text-[13px] data-active:font-medium data-active:text-sidebar-foreground [&>svg]:text-sidebar-foreground/55 data-active:[&>svg]:text-sidebar-primary"
                        >
                          <Link to={subItem.url}>
                            <SubIcon className="size-4" />
                            <span className="tracking-normal">{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        )
      }

      const isActive =
        pathname === item.url || (item.url === "/dashboard" && pathname === "/")

      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.title}
            className={menuButtonClassName}
          >
            <Link to={item.url}>{renderNavLabel(Icon, item.title)}</Link>
          </SidebarMenuButton>

          {item.badge && (
            <SidebarMenuBadge className={badgeClassName}>{item.badge}</SidebarMenuBadge>
          )}
        </SidebarMenuItem>
      )
    })

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Brand header */}
      <SidebarHeader className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4 shadow-xs">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
          <img
            src={logo}
            alt="Tuza Health Logo"
            className="h-8 w-8 object-contain"
          />
          <div className="flex flex-col justify-center">
            <span className="text-base font-medium tracking-tight ">
              Tuza Health
            </span>
            <span className="text-[13px] uppercase tracking-wider font-light text-muted-foreground letter-spacing-[0.02em]">
              Timesheets
            </span>
          </div>
        </div>
      </SidebarHeader>


      {/* Nav content */}
      <SidebarContent className="gap-6 py-4">
        <SidebarGroup className="gap-2.5 px-0">
          <SidebarGroupLabel className="h-7 px-4 text-[13px] font-medium text-muted-foreground">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{renderNav(visibleMainNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleOperationsNav.length > 0 && (
          <SidebarGroup className="gap-2.5 px-0">
            <SidebarGroupLabel className="h-7 px-4 text-[13px] font-medium text-muted-foreground">
              Operations
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">{renderNav(visibleOperationsNav)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
