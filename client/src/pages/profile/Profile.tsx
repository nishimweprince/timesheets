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
  MapPinIcon,
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

  const userInitials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase()
    || user?.email?.slice(0, 2).toUpperCase()
    || "TH"
  const displayName = user?.fullName || user?.email?.split("@")[0] || "Team member"
  const roleLabel = user?.roleNames?.length ? user.roleNames.join(", ") : "No role assigned"
  const membershipStatus = user?.membershipStatus
    ? user.membershipStatus.toLowerCase().replaceAll("_", " ")
    : "-"
  const organizationName = user?.organization?.name ?? "Organization details unavailable"
  const organizationTimezone = user?.organization?.defaultTimezone
    ? `Default timezone: ${user.organization.defaultTimezone}`
    : "Sign in again to refresh organization details"
  const primaryWorkSiteName = user?.primaryWorkSite?.name ?? "Not assigned"
  const primaryWorkSiteTimezone = user?.primaryWorkSite?.timezone
    ? `Timezone: ${user.primaryWorkSite.timezone}`
    : "No primary work site set"

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
          <div className="@container/main flex flex-1 flex-col gap-5 p-4 md:gap-8 md:p-8">
            <div className="flex flex-col gap-3 border-b border-border/60 pb-5">
              <p className="text-[13px] uppercase tracking-[0.12em] text-muted-foreground">
                Account
              </p>
              <div className="flex flex-col gap-1.5">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Profile
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Review your account identity, organization access, and password settings.
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <Card className="border-primary/20">
                <CardHeader className="gap-4 pb-5">
                  <CardDescription className="text-[13px] uppercase text-primary">
                    Signed in as
                  </CardDescription>
                  <div className="flex items-center gap-4 pt-2">
                    <Avatar className="size-14">
                      <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-xl font-semibold">
                        {displayName}
                      </CardTitle>
                      <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex h-6 items-center border border-primary/20 bg-primary/5 px-2 text-[12px] font-medium text-primary">
                          {roleLabel}
                        </span>
                        <span className="inline-flex h-6 items-center border px-2 text-[13px] font-medium capitalize text-muted-foreground">
                          {membershipStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <ProfileDetail icon={UserIcon} label="First name" value={user?.firstName || "-"} />
                    <ProfileDetail icon={UserIcon} label="Last name" value={user?.lastName || "-"} />
                    <ProfileDetail icon={MailIcon} label="Email" value={user?.email ?? "-"} />
                    <ProfileDetail icon={ShieldCheckIcon} label="Roles" value={roleLabel} />
                    <ProfileDetail
                      icon={Building2Icon}
                      label="Organization"
                      value={organizationName}
                      description={organizationTimezone}
                    />
                    <ProfileDetail
                      icon={MapPinIcon}
                      label="Primary work site"
                      value={primaryWorkSiteName}
                      description={primaryWorkSiteTimezone}
                    />
                    <ProfileDetail icon={UserIcon} label="Access status" value={membershipStatus} />
                    <ProfileDetail
                      icon={ShieldCheckIcon}
                      label="Permissions"
                      value={`${user?.permissions.length ?? 0} active`}
                    />
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="gap-3 pb-5">
                  <CardDescription className="text-[13px] uppercase text-primary">
                    Security
                  </CardDescription>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <KeyRoundIcon className="size-4 text-muted-foreground" />
                    Change password
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
                    <div className="grid gap-5">
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

                    <div className="flex flex-col gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-center">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Spinner data-icon="inline-start" />
                            Updating
                          </>
                        ) : (
                          "Update password"
                        )}
                      </Button>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
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

function ProfileDetail({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-t border-border/70 pt-4">
      <Icon className="mt-1 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <dt className="text-[13px] uppercase text-primary">
          {label}
        </dt>
        <dd className="truncate font-normal text-[13px] text-foreground">{value}</dd>
        {description ? (
          <dd className="truncate text-[12px] leading-5 text-muted-foreground">
            {description}
          </dd>
        ) : null}
      </div>
    </div>
  )
}

export default Profile
