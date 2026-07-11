export type DeviceClass = "mobile" | "tablet" | "desktop"

export interface ClockDeviceContext {
  deviceClass: DeviceClass
  browser: string
  browserVersion?: string
  os: string
  platform: string
  userAgent: string
  touchCapable: boolean
  source: "client"
}

function parseBrowser(ua: string): { browser: string; browserVersion?: string } {
  const edge = ua.match(/Edg(?:e|A|iOS)?\/(\d+[\d.]*)/)
  if (edge) return { browser: "Edge", browserVersion: edge[1] }

  const opera = ua.match(/(?:OPR|Opera)\/(\d+[\d.]*)/)
  if (opera) return { browser: "Opera", browserVersion: opera[1] }

  const chrome = ua.match(/(?:Chrome|CriOS)\/(\d+[\d.]*)/)
  if (chrome && !/Edg(?:e|A|iOS)?\//.test(ua)) {
    return { browser: "Chrome", browserVersion: chrome[1] }
  }

  const firefox = ua.match(/(?:Firefox|FxiOS)\/(\d+[\d.]*)/)
  if (firefox) return { browser: "Firefox", browserVersion: firefox[1] }

  const safari = ua.match(/Version\/(\d+[\d.]*)(?: Mobile\/\S+)? Safari\//)
  if (safari && /Safari\//.test(ua) && !/Chrome|CriOS|Chromium/.test(ua)) {
    return { browser: "Safari", browserVersion: safari[1] }
  }

  if (/Safari\//.test(ua) && /Mobile\//.test(ua) && !/Chrome|CriOS|Chromium/.test(ua)) {
    return { browser: "Safari" }
  }

  return { browser: "Unknown" }
}

function parseOs(ua: string, platform: string): string {
  if (/iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && navigatorMaxTouchPoints() > 1)) {
    return "iOS"
  }
  if (/Android/.test(ua)) return "Android"
  if (/CrOS/.test(ua)) return "Chrome OS"
  if (/Windows NT|Win64|Win32/.test(ua) || /^Win/.test(platform)) return "Windows"
  if (/Mac OS X|Macintosh/.test(ua) || /^Mac/.test(platform)) return "macOS"
  if (/Linux/.test(ua) || /^Linux/.test(platform)) return "Linux"
  return platform || "Unknown"
}

function navigatorMaxTouchPoints(): number {
  if (typeof navigator === "undefined") return 0
  return navigator.maxTouchPoints ?? 0
}

function detectDeviceClass(ua: string, touchCapable: boolean): DeviceClass {
  if (/iPad|Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) {
    return "tablet"
  }
  if (
    /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua)
  ) {
    return "mobile"
  }

  // Coarse pointer + multi-touch often indicates phone/tablet when UA is ambiguous.
  if (typeof window !== "undefined") {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches
    if (coarse && touchCapable && navigatorMaxTouchPoints() > 1) {
      const minDim = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0)
      if (minDim >= 600) return "tablet"
      return "mobile"
    }
  }

  return "desktop"
}

/**
 * Capture a lightweight device fingerprint for attendance clock events.
 * Synchronous and permission-free — safe to call at clock time.
 */
export function captureDeviceContext(): ClockDeviceContext {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
  const platform = typeof navigator !== "undefined" ? navigator.platform || "" : ""
  const touchCapable =
    typeof navigator !== "undefined"
      ? navigatorMaxTouchPoints() > 0 ||
        (typeof window !== "undefined" && "ontouchstart" in window)
      : false

  const { browser, browserVersion } = parseBrowser(userAgent)
  const os = parseOs(userAgent, platform)
  const deviceClass = detectDeviceClass(userAgent, touchCapable)

  return {
    deviceClass,
    browser,
    ...(browserVersion ? { browserVersion } : {}),
    os,
    platform,
    userAgent,
    touchCapable,
    source: "client",
  }
}

export function formatDeviceClass(deviceClass: string | undefined | null): string {
  if (!deviceClass) return "Unknown"
  switch (deviceClass) {
    case "mobile":
      return "Mobile"
    case "tablet":
      return "Tablet"
    case "desktop":
      return "Desktop"
    default:
      return deviceClass.charAt(0).toUpperCase() + deviceClass.slice(1)
  }
}

export function formatDeviceSummary(device: Record<string, unknown> | null | undefined): string {
  if (!device || typeof device !== "object") return "Not captured"
  const deviceClass = formatDeviceClass(
    typeof device.deviceClass === "string" ? device.deviceClass : null,
  )
  const browser = typeof device.browser === "string" ? device.browser : null
  const os = typeof device.os === "string" ? device.os : null
  const parts = [deviceClass]
  if (browser && browser !== "Unknown") parts.push(browser)
  if (os && os !== "Unknown") parts.push(os)
  return parts.join(" · ")
}
