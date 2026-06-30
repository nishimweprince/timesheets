"use client"

import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  BarChart3Icon,
  CalendarIcon,
  FileTextIcon,
  HomeIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAppSelector } from "@/states/store/hooks.state"
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
  SidebarRail,
} from "@/components/ui/sidebar"
import logo from "/logo.png"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const mainNav: NavItem[] = [
  { title: "Overview", url: "/dashboard", icon: HomeIcon },
  { title: "My Timesheets", url: "/timesheets", icon: FileTextIcon },
]

const operationsNav: NavItem[] = [
  { title: "Schedule", url: "/scheduling", icon: CalendarIcon },
  { title: "Policies", url: "/policies", icon: ShieldCheckIcon },
  { title: "Reports", url: "#", icon: BarChart3Icon },
  { title: "Team", url: "/team", icon: UsersIcon },
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

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      const Icon = item.icon
      const isActive =
        pathname === item.url || (item.url === "/dashboard" && pathname === "/")

      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.title}
            className={cn(
              "relative h-10 gap-2 rounded-none px-4 text-[13px] font-normal text-sidebar-foreground/72",
              "transition-[background-color,color,box-shadow] duration-150",
              "hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
              "focus-visible:ring-1 focus-visible:ring-sidebar-ring/60",
              "before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-transparent before:content-[''] before:transition-colors",
              "after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-sidebar-border/45 after:content-['']",
              "data-[active=true]:bg-sidebar-accent/70 data-[active=true]:font-normal data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--sidebar-primary)_18%,transparent)] data-[active=true]:before:bg-sidebar-primary",
            )}
          >
            <Link to={item.url}>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center border border-sidebar-border/60 bg-sidebar/70 text-sidebar-foreground/55 transition-colors",
                  "group-hover/menu-button:border-sidebar-border group-hover/menu-button:text-sidebar-foreground/75",
                  "group-data-[active=true]/menu-button:border-sidebar-primary/30 group-data-[active=true]/menu-button:bg-sidebar-primary/10 group-data-[active=true]/menu-button:text-sidebar-primary",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="tracking-normal">{item.title}</span>
            </Link>
          </SidebarMenuButton>

          {item.badge && (
            <SidebarMenuBadge className="right-4 top-2.5 h-5 min-w-5 border border-sidebar-border/60 bg-sidebar px-1.5 text-[13px] font-normal text-sidebar-foreground/60 tabular-nums peer-data-active/menu-button:border-sidebar-primary/30 peer-data-active/menu-button:bg-sidebar-primary/10 peer-data-active/menu-button:text-sidebar-primary">
              {item.badge}
            </SidebarMenuBadge>
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
            <span className="text-xs! uppercase tracking-wider font-light text-muted-foreground letter-spacing-[0.02em]">
              Timesheets
            </span>
          </div>
        </div>
      </SidebarHeader>


      {/* Nav content */}
      <SidebarContent className="gap-5 py-4">
        <SidebarGroup className="gap-2 px-0">
          <SidebarGroupLabel className="h-6 px-4 text-sm text-muted-foreground">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{renderNav(mainNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleOperationsNav.length > 0 && (
          <SidebarGroup className="gap-2 px-0">
            <SidebarGroupLabel className="h-6 px-4 text-sm text-muted-foreground">
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
