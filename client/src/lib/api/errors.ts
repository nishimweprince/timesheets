import { toast } from 'sonner'

import { ApiError } from './client'

export type ApiErrorContext =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'logout'
  | 'generic'

export type ApiErrorToast = {
  title: string
  description: string
}

const MESSAGE_MAP: Record<string, ApiErrorToast> = {
  'Invalid credentials': {
    title: 'Could not sign in',
    description: 'Check your email and password and try again.',
  },
  'No active organization membership': {
    title: 'Account not active',
    description:
      'Your account has no active institution membership. Contact your administrator.',
  },
  'Invalid refresh token': {
    title: 'Session ended',
    description: 'Sign in again to continue.',
  },
  'Session expired': {
    title: 'Session ended',
    description: 'Sign in again to continue.',
  },
  'No refresh token': {
    title: 'Session ended',
    description: 'Sign in again to continue.',
  },
  'Missing bearer token': {
    title: 'Session ended',
    description: 'Sign in again to continue.',
  },
  'Invalid bearer token': {
    title: 'Session ended',
    description: 'Sign in again to continue.',
  },
  'Invalid or expired password reset token': {
    title: 'Link expired',
    description: 'Request a new password reset link and try again.',
  },
  'Internal server error': {
    title: 'Something went wrong',
    description: 'Try again in a moment.',
  },
}

const CONTEXT_FALLBACKS: Record<ApiErrorContext, ApiErrorToast> = {
  login: {
    title: 'Could not sign in',
    description: 'Check your details and try again.',
  },
  'forgot-password': {
    title: 'Could not send reset link',
    description: 'Check your email address and try again.',
  },
  'reset-password': {
    title: 'Could not reset password',
    description: 'Check your new password and try again.',
  },
  logout: {
    title: 'Could not sign out',
    description: 'Try again in a moment.',
  },
  generic: {
    title: 'Something went wrong',
    description: 'Try again in a moment.',
  },
}

export function getApiErrorToast(
  err: unknown,
  context: ApiErrorContext = 'generic',
): ApiErrorToast {
  if (!(err instanceof ApiError)) {
    return CONTEXT_FALLBACKS[context]
  }

  const mapped = MESSAGE_MAP[err.message]
  if (mapped) {
    return mapped
  }

  if (err.status === 401 && context === 'login') {
    return CONTEXT_FALLBACKS.login
  }

  if (err.status === 401 && context === 'reset-password') {
    return MESSAGE_MAP['Invalid or expired password reset token']
  }

  if (err.status >= 500) {
    return MESSAGE_MAP['Internal server error']
  }

  if (err.message && !err.message.startsWith('Request failed with status')) {
    return {
      title: CONTEXT_FALLBACKS?.[context]?.title,
      description: err?.message,
    }
  }

  return CONTEXT_FALLBACKS[context]
}

export function showApiErrorToast(
  err: unknown,
  context: ApiErrorContext = 'generic',
): void {
  const { title, description } = getApiErrorToast(err, context)
  toast.error(title, { description })
}

export const AUTH_TOASTS = {
  loginSuccess: {
    title: 'Signed in',
    description: 'Welcome back to Tuza Health Timesheets.',
  },
  logoutSuccess: {
    title: 'Signed out',
    description: 'You have been signed out of your account.',
  },
  resetPasswordSuccess: {
    title: 'Password updated',
    description: 'Sign in with your new password.',
  },
} as const

export function showAuthSuccessToast(
  key: keyof typeof AUTH_TOASTS,
): void {
  const { title, description } = AUTH_TOASTS[key]
  toast.success(title, { description })
}