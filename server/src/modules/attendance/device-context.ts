export type DeviceClass = 'mobile' | 'tablet' | 'desktop';
export type DeviceContextSource = 'client' | 'server' | 'merged';

export interface DeviceContext {
  deviceClass: DeviceClass | 'unknown';
  browser: string;
  browserVersion?: string;
  os: string;
  platform?: string;
  userAgent: string;
  touchCapable?: boolean;
  source: DeviceContextSource;
}

function parseBrowser(ua: string): { browser: string; browserVersion?: string } {
  const edge = ua.match(/Edg(?:e|A|iOS)?\/(\d+[\d.]*)/);
  if (edge) return { browser: 'Edge', browserVersion: edge[1] };

  const opera = ua.match(/(?:OPR|Opera)\/(\d+[\d.]*)/);
  if (opera) return { browser: 'Opera', browserVersion: opera[1] };

  const chrome = ua.match(/(?:Chrome|CriOS)\/(\d+[\d.]*)/);
  if (chrome && !/Edg(?:e|A|iOS)?\//.test(ua)) {
    return { browser: 'Chrome', browserVersion: chrome[1] };
  }

  const firefox = ua.match(/(?:Firefox|FxiOS)\/(\d+[\d.]*)/);
  if (firefox) return { browser: 'Firefox', browserVersion: firefox[1] };

  const safari = ua.match(/Version\/(\d+[\d.]*)(?: Mobile\/\S+)? Safari\//);
  if (safari && /Safari\//.test(ua) && !/Chrome|CriOS|Chromium/.test(ua)) {
    return { browser: 'Safari', browserVersion: safari[1] };
  }

  if (/Safari\//.test(ua) && /Mobile\//.test(ua) && !/Chrome|CriOS|Chromium/.test(ua)) {
    return { browser: 'Safari' };
  }

  return { browser: 'Unknown' };
}

function parseOs(ua: string): string {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/CrOS/.test(ua)) return 'Chrome OS';
  if (/Windows NT|Win64|Win32/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

function parseDeviceClass(ua: string): DeviceClass | 'unknown' {
  if (!ua || ua === 'jest' || ua.length < 3) return 'unknown';
  if (/iPad|Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) {
    return 'tablet';
  }
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua)) {
    return 'mobile';
  }
  if (/Windows|Macintosh|Linux|CrOS|X11/.test(ua)) return 'desktop';
  return 'unknown';
}

/**
 * Best-effort User-Agent parse for attendance device context.
 * Never throws — incomplete UAs still return a structured object.
 */
export function parseUserAgent(userAgent: string | undefined | null): DeviceContext | null {
  const ua = (userAgent ?? '').trim();
  if (!ua) return null;

  const { browser, browserVersion } = parseBrowser(ua);
  return {
    deviceClass: parseDeviceClass(ua),
    browser,
    ...(browserVersion ? { browserVersion } : {}),
    os: parseOs(ua),
    userAgent: ua,
    source: 'server'
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function pickDeviceClass(value: unknown): DeviceClass | 'unknown' | undefined {
  if (value === 'mobile' || value === 'tablet' || value === 'desktop' || value === 'unknown') {
    return value;
  }
  return undefined;
}

/**
 * Merge server UA parse with optional client-supplied device payload.
 * Client fields win when present. Always returns a context when either side has data.
 */
export function mergeDeviceContext(
  userAgent: string | undefined | null,
  clientDevice?: Record<string, unknown> | null
): Record<string, unknown> | null {
  const fromServer = parseUserAgent(userAgent);
  const hasClient = isPlainObject(clientDevice) && Object.keys(clientDevice).length > 0;

  if (!fromServer && !hasClient) return null;

  if (!hasClient && fromServer) {
    return { ...fromServer };
  }

  if (!fromServer && hasClient) {
    return {
      deviceClass: pickDeviceClass(clientDevice!.deviceClass) ?? 'unknown',
      browser: pickString(clientDevice!.browser) ?? 'Unknown',
      ...(pickString(clientDevice!.browserVersion)
        ? { browserVersion: pickString(clientDevice!.browserVersion) }
        : {}),
      os: pickString(clientDevice!.os) ?? 'Unknown',
      ...(pickString(clientDevice!.platform) ? { platform: pickString(clientDevice!.platform) } : {}),
      userAgent: pickString(clientDevice!.userAgent) ?? userAgent ?? '',
      ...(typeof clientDevice!.touchCapable === 'boolean'
        ? { touchCapable: clientDevice!.touchCapable }
        : {}),
      source: 'client' as const,
      ...clientDevice
    };
  }

  // Both sides present — client overlays server parse.
  const client = clientDevice!;
  const merged: Record<string, unknown> = {
    ...fromServer,
    ...client,
    deviceClass:
      pickDeviceClass(client.deviceClass) ?? fromServer!.deviceClass,
    browser: pickString(client.browser) ?? fromServer!.browser,
    os: pickString(client.os) ?? fromServer!.os,
    userAgent:
      pickString(client.userAgent) ?? fromServer!.userAgent ?? userAgent ?? '',
    source: 'merged'
  };

  const browserVersion =
    pickString(client.browserVersion) ?? fromServer!.browserVersion;
  if (browserVersion) merged.browserVersion = browserVersion;
  else delete merged.browserVersion;

  const platform = pickString(client.platform);
  if (platform) merged.platform = platform;

  if (typeof client.touchCapable === 'boolean') {
    merged.touchCapable = client.touchCapable;
  }

  return merged;
}
