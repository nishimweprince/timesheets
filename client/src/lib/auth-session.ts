export interface AuthUser {
  userId: string
  membershipId: string
  organizationId: string
  organization?: {
    id: string
    name: string
    defaultTimezone: string
  }
  email: string
  firstName?: string
  lastName?: string
  fullName?: string
  membershipStatus?: 'PENDING' | 'ACTIVE' | 'INACTIVE'
  primaryWorkSiteId?: string | null
  primaryWorkSite?: {
    id: string
    name: string
    timezone: string
  } | null
  roleNames?: string[]
  permissions: string[]
  sessionId?: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

const ACCESS_TOKEN_KEY = 'tuza_access_token'
const REFRESH_TOKEN_KEY = 'tuza_refresh_token'
const USER_KEY = 'tuza_user'

export type SessionTokens = {
  accessToken: string | null
  refreshToken: string | null
}

let sessionChangeListener: ((payload: TokenResponse) => void) | null = null
let sessionClearListener: (() => void) | null = null

export function onSessionChange(listener: (payload: TokenResponse) => void) {
  sessionChangeListener = listener
}

export function onSessionClear(listener: () => void) {
  sessionClearListener = listener
}

export function readSessionTokens(): SessionTokens {
  try {
    return {
      accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
    }
  } catch {
    return { accessToken: null, refreshToken: null }
  }
}

export function loadStoredUser(): AuthUser | null {
  try {
    const rawUser = localStorage.getItem(USER_KEY)
    return rawUser ? (JSON.parse(rawUser) as AuthUser) : null
  } catch {
    return null
  }
}

export function writeSessionStorage(payload: TokenResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken)
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
}

export function clearSessionStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** Used by apiRequest after a token refresh — persists and syncs Redux. */
export function persistSession(payload: TokenResponse) {
  writeSessionStorage(payload)
  sessionChangeListener?.(payload)
}

/** Used by apiRequest on hard auth failure — clears storage and syncs Redux. */
export function clearSession() {
  clearSessionStorage()
  sessionClearListener?.()
}
