"use client"

import { Link } from "react-router-dom"
import { LogOutIcon, UserIcon } from "lucide-react"

import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import { clearAuth } from "@/states/features/auth.slice"
import { authApi } from "@/lib/api/auth.api"
import { showApiErrorToast, showAuthSuccessToast } from "@/lib/api/errors"
import { useNavigate } from "react-router-dom"

import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
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

export function SiteHeader() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)

  const handleLogout = async () => {
    try {
      await authApi.logout()
      showAuthSuccessToast("logoutSuccess")
    } catch (err) {
      showApiErrorToast(err, "logout")
    } finally {
      dispatch(clearAuth())
      navigate("/auth/login", { replace: true })
    }
  }

  const userInitials =
    user?.email?.slice(0, 2).toUpperCase() || "TH"

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear">
      <div className="flex flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm tracking-tight">Dashboard</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pl-1 pr-2 h-9 rounded-none">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm text-muted-foreground">
                  {user.email?.split("@")[0]}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Account</span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center gap-2">
                  <UserIcon className="size-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOutIcon className="size-4" data-icon="inline-start" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
