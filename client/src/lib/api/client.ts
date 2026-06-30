import { store } from '@/states/store/store'
import { clearAuth, setAuth } from '@/states/features/auth.slice'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Singleton refresh promise — prevents concurrent 401s from triggering multiple refreshes
let refreshingPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  const { auth } = store.getState()
  if (!auth.refreshToken) throw new ApiError(401, 'No refresh token')

  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: auth.refreshToken }),
  })

  if (!res.ok) throw new ApiError(res.status, 'Session expired')

  const data = (await res.json()) as { accessToken: string; refreshToken: string; user: unknown }
  store.dispatch(setAuth(data as Parameters<typeof setAuth>[0]))
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
  const { auth } = store.getState()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  }

  if (auth.accessToken) {
    headers['Authorization'] = `Bearer ${auth.accessToken}`
  }

  const init: RequestInit = {
    ...rest,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }

  let res = await fetch(`${BASE_URL}/api/v1${path}`, init)

  if (res.status === 401 && auth.refreshToken) {
    try {
      const newToken = await getNewAccessToken()
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${BASE_URL}/api/v1${path}`, { ...init, headers })
    } catch {
      store.dispatch(clearAuth())
      window.location.href = '/auth/login'
      throw new ApiError(401, 'Session expired')
    }
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`
    try {
      const err = (await res.json()) as { message?: string | string[] }
      if (err.message) {
        message = Array.isArray(err.message) ? err.message[0] : err.message
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
