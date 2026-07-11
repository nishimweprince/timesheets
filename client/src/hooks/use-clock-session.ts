import * as React from "react"

import { useAppDispatch, useAppSelector } from "@/states/store/hooks.state"
import {
  clockIn,
  clockOut,
  endBreak,
  fetchCurrentSession,
  fetchEffectivePolicy,
  fetchHistory,
  startBreak,
} from "@/states/features/attendance.slice"
import { WorkSessionStatus } from "@/lib/api/attendance.api"
import { showApiErrorToast } from "@/lib/api/errors"
import { captureDeviceContext } from "@/lib/device"
import { setLocation } from "@/states/features/location.slice"

export interface SelectedShiftContext {
  requestedShiftAssignmentId?: string
  requestedShiftInstanceId?: string
  requestedShiftPatternAssignmentId?: string
}

export function useClockSession(enabled = true, selectedShiftContext?: SelectedShiftContext) {
  const dispatch = useAppDispatch()

  const currentSession = useAppSelector((s) => s.attendance.currentSession)
  const clockInLoading = useAppSelector((s) => s.attendance.status.clockIn === "loading")
  const clockOutLoading = useAppSelector((s) => s.attendance.status.clockOut === "loading")
  const breakLoading = useAppSelector((s) => s.attendance.status.break === "loading")
  const storedCoords = useAppSelector((s) => s.location.coords)
  const effectivePolicy = useAppSelector((s) => s.attendance.effectivePolicy)

  React.useEffect(() => {
    if (!enabled) return

    dispatch(fetchCurrentSession())
    dispatch(fetchEffectivePolicy())
  }, [dispatch, enabled])

  const isOnShift = currentSession?.status === WorkSessionStatus.OPEN

  const getLocation = (): Promise<{
    latitude: number
    longitude: number
    accuracyMeters: number
    capturedAt: string
  }> =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyMeters: pos.coords.accuracy,
            capturedAt: new Date().toISOString(),
          }
          dispatch(setLocation({ ...coords, accuracy: pos.coords.accuracy }))
          resolve(coords)
        },
        () => {
          // Fall back to the last known position from the guard
          if (storedCoords) {
            resolve({
              latitude: storedCoords.latitude,
              longitude: storedCoords.longitude,
              accuracyMeters: storedCoords.accuracy,
              capturedAt: storedCoords.capturedAt,
            })
          } else {
            reject(new Error("Location unavailable"))
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      )
    })

  const buildClockPayload = (
    location: {
      latitude: number
      longitude: number
      accuracyMeters: number
      capturedAt: string
    },
    extras?: {
      cameraEvidenceId?: string
      selectedShift?: SelectedShiftContext
    },
  ) => ({
    clientReportedAt: new Date().toISOString(),
    clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    clientUtcOffsetMinutes: -new Date().getTimezoneOffset(),
    location: { ...location, source: "browser", permissionState: "granted" as const },
    device: captureDeviceContext(),
    ...(extras?.selectedShift ?? {}),
    ...(extras?.cameraEvidenceId ? { cameraEvidenceId: extras.cameraEvidenceId } : {}),
  })

  const handleClockIn = async (cameraEvidenceId?: string) => {
    if (!enabled) return

    try {
      const location = await getLocation()
      await dispatch(
        clockIn(
          buildClockPayload(location, {
            cameraEvidenceId,
            selectedShift: selectedShiftContext,
          }),
        ),
      ).unwrap()
      dispatch(fetchCurrentSession())
      dispatch(fetchHistory({ page: 1, pageSize: 10 }))
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  const handleClockOut = async (cameraEvidenceId?: string) => {
    if (!enabled) return

    try {
      const location = await getLocation()
      await dispatch(
        clockOut(buildClockPayload(location, { cameraEvidenceId })),
      ).unwrap()
      dispatch(fetchCurrentSession())
      dispatch(fetchHistory({ page: 1, pageSize: 10 }))
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  const handleBreakEvent = async (action: "start" | "end") => {
    if (!enabled) return

    try {
      const location = await getLocation()
      await dispatch(
        (action === "start" ? startBreak : endBreak)(buildClockPayload(location)),
      ).unwrap()
      dispatch(fetchCurrentSession())
      dispatch(fetchHistory({ page: 1, pageSize: 10 }))
    } catch (err) {
      showApiErrorToast(err)
    }
  }

  return {
    currentSession,
    isOnShift,
    clockInLoading,
    clockOutLoading,
    breakLoading,
    actionLoading: clockInLoading || clockOutLoading,
    effectivePolicy,
    handleClockIn,
    handleClockOut,
    handleStartBreak: () => handleBreakEvent("start"),
    handleEndBreak: () => handleBreakEvent("end"),
  }
}
