"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Building2Icon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  MailIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import Input from "@/components/reusable/inputs/Input"
import { SiteHeader } from "@/components/site-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { authApi } from "@/lib/api/auth.api"
import { showApiErrorToast, showAuthSuccessToast } from "@/lib/api/errors"
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "@/lib/validations/auth"
import { useAppSelector } from "@/states/store/hooks.state"

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword"

const Profile = () => {
  const user = useAppSelector((state) => state.auth.user)
  const [visiblePasswords, setVisiblePasswords] = React.useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "TH"
  const displayName = user?.email?.split("@")[0] || "Team member"

  const togglePassword = (field: PasswordField) => {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }))
  }

  const passwordVisibilityButton = (field: PasswordField) => {
    const isVisible = visiblePasswords[field]

    return (
      <button
        type="button"
        aria-label={isVisible ? "Hide password" : "Show password"}
        onClick={() => togglePassword(field)}
        className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
      >
        {isVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    )
  }

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsSubmitting(true)
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      reset()
      showAuthSuccessToast("changePasswordSuccess")
    } catch (err) {
      showApiErrorToast(err, "change-password")
    } finally {
      setIsSubmitting(false)
    }
  }

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
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Account
              </p>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Profile
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Review your signed-in account and update the password used for Tuza Health Timesheets.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <Card>
                <CardHeader>
                  <CardDescription className="uppercase tracking-[0.12em] text-xs">
                    Signed in as
                  </CardDescription>
                  <div className="flex items-center gap-3 pt-2">
                    <Avatar className="size-11">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base font-semibold">
                        {displayName}
                      </CardTitle>
                      <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-3 text-sm">
                    <div className="flex items-start gap-3 border-t pt-3">
                      <MailIcon className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Email
                        </dt>
                        <dd className="truncate font-medium text-foreground">{user?.email ?? "-"}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 border-t pt-3">
                      <Building2Icon className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Organization
                        </dt>
                        <dd className="truncate font-mono text-xs text-foreground">
                          {user?.organizationId ?? "-"}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 border-t pt-3">
                      <UserIcon className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Membership
                        </dt>
                        <dd className="truncate font-mono text-xs text-foreground">
                          {user?.membershipId ?? "-"}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 border-t pt-3">
                      <ShieldCheckIcon className="mt-0.5 size-4 text-muted-foreground" />
                      <div>
                        <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                          Permissions
                        </dt>
                        <dd className="font-medium text-foreground">
                          {user?.permissions.length ?? 0} active
                        </dd>
                      </div>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription className="uppercase tracking-[0.12em] text-xs">
                    Security
                  </CardDescription>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <KeyRoundIcon className="size-4 text-muted-foreground" />
                    Change password
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
                    <div className="grid gap-4">
                      <Input
                        label="Current password"
                        type={visiblePasswords.currentPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your current password"
                        error={errors.currentPassword?.message}
                        required
                        suffix={passwordVisibilityButton("currentPassword")}
                        {...register("currentPassword")}
                      />

                      <Input
                        label="New password"
                        type={visiblePasswords.newPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        error={errors.newPassword?.message}
                        required
                        suffix={passwordVisibilityButton("newPassword")}
                        {...register("newPassword")}
                      />

                      <Input
                        label="Confirm new password"
                        type={visiblePasswords.confirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Repeat your new password"
                        error={errors.confirmPassword?.message}
                        required
                        suffix={passwordVisibilityButton("confirmPassword")}
                        {...register("confirmPassword")}
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button type="submit" className="h-10 px-4" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Spinner data-icon="inline-start" />
                            Updating
                          </>
                        ) : (
                          "Update password"
                        )}
                      </Button>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Use a password you have not used for this account before.
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Profile
