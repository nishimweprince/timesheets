"use client"

import { Link, useLocation } from "react-router-dom"
import { ChevronDownIcon, LogOutIcon, UserIcon } from "lucide-react"

import { useAppSelector } from "@/states/store/hooks.state"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function pageTitleForPath(pathname: string): string {
  if (pathname === "/" || pathname === "/dashboard") return "Home"
  if (pathname === "/timesheets") return "My Timesheets"
  if (pathname === "/profile") return "Profile"
  if (pathname === "/reports") return "Hours report"
  if (pathname === "/reports/review") return "Review"
  if (pathname === "/reports/exception-queue") return "Exception queue"
  if (pathname.startsWith("/reports/exception-queue/")) return "Exception detail"
  if (pathname === "/reports/exceptions") return "Exception report"
  if (pathname === "/scheduling") return "Coverage"
  if (pathname === "/scheduling/clock-ins") return "Clock-ins"
  if (pathname.startsWith("/scheduling/clock-ins/")) return "Clock-in detail"
  if (pathname === "/scheduling/shifts") return "Generated shifts"
  if (pathname === "/scheduling/assignments") return "Shift assignments"
  if (pathname === "/policies") return "Policies"
  if (pathname === "/policies/work-sites") return "Work sites"
  if (pathname === "/team") return "Employees"
  if (pathname === "/team/teams") return "Teams"
  return "Tuza Health"
}

export function SiteHeader() {
  const user = useAppSelector((state) => state.auth.user)
  const { pathname } = useLocation()
  const pageTitle = pageTitleForPath(pathname)

  const userInitials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "TH"
  const userName = user?.fullName || user?.email?.split("@")[0]
  const roleLabel = user?.roleNames?.[0] ?? user?.membershipStatus?.toLowerCase()

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear">
      <div className="flex flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1 cursor-pointer" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold tracking-tight text-foreground">
            {pageTitle}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 cursor-pointer gap-2.5 rounded-xs border border-transparent pl-1.5 pr-2.5 hover:border-border hover:bg-muted/70 aria-expanded:border-border aria-expanded:bg-muted"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-[13px] font-semibold text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 truncate text-[13px] font-medium text-foreground sm:inline">
                  {userName}
                </span>
                <ChevronDownIcon className="hidden size-4 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-2">
              <DropdownMenuLabel className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-foreground">
                      {userName}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {user.email}
                    </span>
                    {roleLabel ? (
                      <span className="block truncate text-xs capitalize text-muted-foreground">
                        {roleLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem asChild className="cursor-pointer px-3 py-2.5 text-[13px]">
                <Link to="/profile" className="flex items-center gap-3">
                  <UserIcon className="size-4 text-muted-foreground" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                asChild
                className="cursor-pointer px-3 py-2.5 text-[13px] text-destructive focus:text-destructive"
              >
                <Link to="/auth/signout" className="flex items-center gap-3">
                  <LogOutIcon className="size-4" data-icon="inline-start" />
                  Sign out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
