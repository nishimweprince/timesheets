import { apiRequest } from './client'
import type { TokenResponse } from '@/states/features/auth.slice'

export const authApi = {
  login(body: { email: string; password: string; organizationId?: string }): Promise<TokenResponse> {
    return apiRequest<TokenResponse>('/auth/login', { method: 'POST', body })
  },

  refresh(body: { refreshToken: string }): Promise<TokenResponse> {
    return apiRequest<TokenResponse>('/auth/refresh', { method: 'POST', body })
  },

  logout(): Promise<{ success: true }> {
    return apiRequest<{ success: true }>('/auth/logout', { method: 'POST' })
  },

  forgotPassword(body: { email: string }): Promise<{ success: true }> {
    return apiRequest<{ success: true }>('/auth/forgot-password', { method: 'POST', body })
  },

  resetPassword(body: { token: string; password: string }): Promise<{ success: true }> {
    return apiRequest<{ success: true }>('/auth/reset-password', { method: 'POST', body })
  },
}
