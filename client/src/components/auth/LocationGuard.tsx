"use client"

import * as React from "react"
import { Outlet } from "react-router-dom"
import { ClockIcon, MapPinIcon, MapPinOffIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAppDispatch } from "@/states/store/hooks.state"
import { setLocation } from "@/states/features/location.slice"

type PermState = "idle" | "requesting" | "waiting" | "granted" | "denied" | "unavailable"

// --- Requesting screen ---

function RequestingScreen({
  onEnable,
  isWaiting,
}: {
  onEnable: () => void
  isWaiting: boolean
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Brand bar */}
      <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center border border-primary/20 bg-primary text-primary-foreground">
            <ClockIcon className="size-3.5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-[13px] font-medium tracking-tight text-foreground">
              Tuza Health
            </span>
            <span className="text-[13px] font-normal tracking-[0.14em] uppercase text-muted-foreground/60">
              Timesheets
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="mb-6 flex size-12 items-center justify-center border border-primary/20 bg-primary/8">
            <MapPinIcon className="size-5 text-primary" />
          </div>

          <p className="mb-1 text-[13px] font-normal tracking-[0.14em] uppercase text-muted-foreground/60">
            Permission required
          </p>
          <h1 className="mb-3 text-xl font-medium tracking-tight text-foreground">
            Location access required
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
            Tuza Health relies on a user's location to operate properly. Please allow location access to continue.
          </p>

          <Button
            size="lg"
            className="h-11 w-full rounded-xs text-sm font-medium"
            onClick={onEnable}
            disabled={isWaiting}
          >
            {isWaiting ? "Waiting for permission…" : "Allow location access"}
          </Button>

          <p className="mt-4 text-[13px] leading-5 text-muted-foreground/70">
            Your location is only used during the attendance process and is never shared or stored beyond your attendance record.
          </p>
        </div>
      </div>
    </div>
  )
}

// --- Denied screen ---

function DeniedScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Brand bar */}
      <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center border border-primary/20 bg-primary text-primary-foreground">
            <ClockIcon className="size-3.5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-[13px] font-medium tracking-tight text-foreground">
              Tuza Health
            </span>
            <span className="text-[13px] font-normal tracking-[0.14em] uppercase text-muted-foreground/60">
              Timesheets
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Concentric rings with icon — the dead GPS signal motif */}
          <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
            {/* Outer ring */}
            <div
              className="absolute rounded-full border border-border"
              style={{ width: 128, height: 128, opacity: 0.22 }}
            />
            {/* Middle ring */}
            <div
              className="absolute rounded-full border border-border"
              style={{ width: 88, height: 88, opacity: 0.38 }}
            />
            {/* Inner ring */}
            <div
              className="absolute rounded-full border border-border"
              style={{ width: 52, height: 52, opacity: 0.55 }}
            />
            {/* Icon */}
            <MapPinOffIcon className="relative z-10 size-6 text-muted-foreground/45" />
          </div>

          <p className="mb-1 text-[13px] font-normal tracking-[0.14em] uppercase text-muted-foreground/60">
            Access restricted
          </p>
          <h1 className="mb-3 text-xl font-medium tracking-tight text-foreground">
            Location access is required
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
            This application requires your location to verify that you are at an
            approved work site when clocking in or out. Without it, attendance
            cannot be recorded.
          </p>

          {/* Separator + instructions */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[13px] tracking-[0.12em] uppercase text-muted-foreground/60">
              How to re-enable
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <ol className="mb-8 flex flex-col gap-3">
            {[
              "Click the lock or info icon in your browser's address bar.",
              'Find "Location" in the site permissions and set it to "Allow".',
              "Return here and click Try again.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-border font-mono text-[13px] tabular-nums text-muted-foreground/70">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>

          <Button
            variant="outline"
            size="lg"
            className="h-11 w-full rounded-xs text-sm font-medium"
            onClick={onRetry}
          >
            <RefreshCwIcon className="mr-2 size-3.5" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Unavailable screen (no geolocation API) ---

function UnavailableScreen() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center border border-primary/20 bg-primary text-primary-foreground">
            <ClockIcon className="size-3.5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-[13px] font-medium tracking-tight text-foreground">
              Tuza Health
            </span>
            <span className="text-[13px] font-normal tracking-[0.14em] uppercase text-muted-foreground/60">
              Timesheets
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
            <div className="absolute rounded-full border border-border" style={{ width: 128, height: 128, opacity: 0.22 }} />
            <div className="absolute rounded-full border border-border" style={{ width: 88, height: 88, opacity: 0.38 }} />
            <div className="absolute rounded-full border border-border" style={{ width: 52, height: 52, opacity: 0.55 }} />
            <MapPinOffIcon className="relative z-10 size-6 text-muted-foreground/45" />
          </div>
          <p className="mb-1 text-[13px] font-normal tracking-[0.14em] uppercase text-muted-foreground/60">
            Unsupported browser
          </p>
          <h1 className="mb-3 text-xl font-medium tracking-tight text-foreground">
            Location is not available
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your browser does not support location services. Please use a modern
            browser such as Chrome, Firefox, or Safari on a supported device.
          </p>
        </div>
      </div>
    </div>
  )
}

// --- Guard ---

const LocationGuard = () => {
  const dispatch = useAppDispatch()
  const [permState, setPermState] = React.useState<PermState>(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return "unavailable"
    }
    return navigator.permissions ? "idle" : "requesting"
  })

  const acquirePosition = React.useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        dispatch(
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            capturedAt: new Date().toISOString(),
          })
        )
        setPermState("granted")
      },
      () => {
        setPermState("denied")
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }, [dispatch])

  React.useEffect(() => {
    if (!navigator.geolocation) {
      return
    }

    const setupPermissionWatch = (result: PermissionStatus) => {
      const handleChange = () => {
        if (result.state === "granted") {
          acquirePosition()
        } else if (result.state === "denied") {
          setPermState("denied")
        }
      }
      result.addEventListener("change", handleChange)
      return () => result.removeEventListener("change", handleChange)
    }

    if (navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "granted") {
            acquirePosition()
          } else if (result.state === "denied") {
            setPermState("denied")
          } else {
            setPermState("requesting")
          }
          setupPermissionWatch(result)
        })
        .catch(() => {
          setPermState("requesting")
        })
    }
  }, [acquirePosition])

  const handleEnable = () => {
    setPermState("waiting")
    acquirePosition()
  }

  const handleRetry = () => {
    setPermState("waiting")
    acquirePosition()
  }

  if (permState === "idle") return null

  if (permState === "unavailable") return <UnavailableScreen />

  if (permState === "requesting" || permState === "waiting") {
    return (
      <RequestingScreen
        onEnable={handleEnable}
        isWaiting={permState === "waiting"}
      />
    )
  }

  if (permState === "denied") {
    return <DeniedScreen onRetry={handleRetry} />
  }

  return <Outlet />
}

export default LocationGuard
