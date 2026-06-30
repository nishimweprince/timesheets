import {
  clearSession,
  persistSession,
  readSessionTokens,
  type TokenResponse,
} from '@/lib/auth-session'

type ApiErrorBody = {
  message?: string | string[]
  error?: {
    message?: string | string[]
    error?: string
    statusCode?: number
  }
}

function extractApiErrorMessage(body: ApiErrorBody): string | undefined {
  if (body.message) {
    return Array.isArray(body.message) ? body.message[0] : body.message
  }

  const nested = body.error?.message
  if (nested) {
    return Array.isArray(nested) ? nested[0] : nested
  }

  return undefined
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  public readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let refreshingPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  const { refreshToken } = readSessionTokens()
  if (!refreshToken) throw new ApiError(401, 'No refresh token')

  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) throw new ApiError(res.status, 'Session expired')

  const data = (await res.json()) as TokenResponse
  persistSession(data)
  return data.accessToken
}

async function getNewAccessToken(): Promise<string> {
  if (!refreshingPromise) {
    refreshingPromise = doRefresh().finally(() => {
      refreshingPromise = null
    })
  }
  return refreshingPromise
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options
  const { accessToken, refreshToken } = readSessionTokens()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const init: RequestInit = {
    ...rest,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  let res = await fetch(`${BASE_URL}/api/v1${path}`, init)

  if (res.status === 401 && refreshToken) {
    try {
      const newToken = await getNewAccessToken()
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${BASE_URL}/api/v1${path}`, { ...init, headers })
    } catch {
      clearSession()
      window.location.href = '/auth/login'
      throw new ApiError(401, 'Session expired')
    }
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const body = (await res.json()) as Parameters<typeof extractApiErrorMessage>[0]
      const extracted = extractApiErrorMessage(body)
      if (extracted) {
        message = extracted
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}