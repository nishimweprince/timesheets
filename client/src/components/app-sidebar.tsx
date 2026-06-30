"use client"

import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import {
  BarChart3Icon,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  HomeIcon,
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
  { title: "Reports", url: "#", icon: BarChart3Icon },
  { title: "Team", url: "/team", icon: UsersIcon },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation()
  const employeeCount = useAppSelector((state) => state.employeeManagement.employees.length)
  const permissions = useAppSelector((state) => state.auth.user?.permissions ?? [])
  const canReadEmployees = permissions.includes("employee.read")

  const visibleOperationsNav = operationsNav
    .filter((item) => item.title !== "Team" || canReadEmployees)
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
        <SidebarMenuItem key={item.title} className="px-2">
          <SidebarMenuButton
            asChild
            isActive={isActive}
            size="lg"
            tooltip={item.title}
            className={cn(
              "relative h-11 gap-3 rounded-none px-3 text-[13px] font-normal text-sidebar-foreground/72",
              "transition-[background-color,color,box-shadow] duration-150",
              "hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
              "focus-visible:ring-1 focus-visible:ring-sidebar-ring/60",
              "before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-transparent before:content-[''] before:transition-colors",
              "after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-sidebar-border/45 after:content-['']",
              "data-[active=true]:bg-sidebar-accent/70 data-[active=true]:font-normal data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--sidebar-primary)_18%,transparent)] data-[active=true]:before:bg-sidebar-primary",
            )}
          >
            <Link to={item.url}>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center border border-sidebar-border/60 bg-sidebar/70 text-sidebar-foreground/55 transition-colors",
                  "group-hover/menu-button:border-sidebar-border group-hover/menu-button:text-sidebar-foreground/75",
                  "group-data-[active=true]/menu-button:border-sidebar-primary/30 group-data-[active=true]/menu-button:bg-sidebar-primary/10 group-data-[active=true]/menu-button:text-sidebar-primary",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="text-[13px] tracking-normal">{item.title}</span>
            </Link>
          </SidebarMenuButton>

          {item.badge && (
            <SidebarMenuBadge className="right-5 top-3 h-5 min-w-5 border border-sidebar-border/60 bg-sidebar px-1.5 text-[10px] font-normal text-sidebar-foreground/60 tabular-nums peer-data-active/menu-button:border-sidebar-primary/30 peer-data-active/menu-button:bg-sidebar-primary/10 peer-data-active/menu-button:text-sidebar-primary">
              {item.badge}
            </SidebarMenuBadge>
          )}
        </SidebarMenuItem>
      )
    })

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Brand header */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center border border-primary/20 bg-primary text-primary-foreground shadow-[0_8px_24px_color-mix(in_oklch,var(--primary)_18%,transparent)]">
            <ClockIcon className="size-3.5" />
          </div>

          <div className="flex flex-col gap-1 leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-[13px] font-medium tracking-tight text-sidebar-foreground">
              Tuza Health
            </span>
            <span className="text-[9px] font-normal tracking-[0.2em] uppercase text-muted-foreground/60">
              Timesheets
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Nav content */}
      <SidebarContent className="gap-5 py-4">
        <SidebarGroup className="gap-2 px-0">
          <SidebarGroupLabel className="h-6 px-4 text-[10px] font-normal tracking-[0.18em] uppercase text-muted-foreground/55">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{renderNav(mainNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="gap-2 px-0">
          <SidebarGroupLabel className="h-6 px-4 text-[10px] font-normal tracking-[0.18em] uppercase text-muted-foreground/55">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{renderNav(visibleOperationsNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
