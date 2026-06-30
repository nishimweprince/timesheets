import { createSlice } from '@reduxjs/toolkit'
import {
  clearSessionStorage,
  loadStoredUser,
  readSessionTokens,
  writeSessionStorage,
  type AuthUser,
  type TokenResponse,
} from '@/lib/auth-session'

export type { AuthUser, TokenResponse }

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
}

function loadFromStorage(): AuthState {
  const { accessToken, refreshToken } = readSessionTokens()
  const user = loadStoredUser()

  if (accessToken && refreshToken && user) {
    return { accessToken, refreshToken, user, isAuthenticated: true }
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
      writeSessionStorage(action.payload)
    },
    clearAuth: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      state.isAuthenticated = false
      clearSessionStorage()
    },
  },
})

export const { setAuth, clearAuth } = authSlice.actions
export default authSlice.reducer