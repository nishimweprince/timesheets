import { createSlice } from '@reduxjs/toolkit'

export interface AuthUser {
  userId: string
  membershipId: string
  organizationId: string
  email: string
  permissions: string[]
  sessionId?: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
}

const ACCESS_TOKEN_KEY = 'tuza_access_token'
const REFRESH_TOKEN_KEY = 'tuza_refresh_token'
const USER_KEY = 'tuza_user'

function loadFromStorage(): AuthState {
  try {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const rawUser = localStorage.getItem(USER_KEY)
    const user: AuthUser | null = rawUser ? (JSON.parse(rawUser) as AuthUser) : null

    if (accessToken && refreshToken && user) {
      return { accessToken, refreshToken, user, isAuthenticated: true }
    }
  } catch {
    // corrupted storage — fall through to empty state
  }
  return { accessToken: null, refreshToken: null, user: null, isAuthenticated: false }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadFromStorage,
  reducers: {
    setAuth: (state, action: { payload: TokenResponse }) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.user = action.payload.user
      state.isAuthenticated = true
      localStorage.setItem(ACCESS_TOKEN_KEY, action.payload.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, action.payload.refreshToken)
      localStorage.setItem(USER_KEY, JSON.stringify(action.payload.user))
    },
    clearAuth: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      state.isAuthenticated = false
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})

export const { setAuth, clearAuth } = authSlice.actions
export default authSlice.reducer
