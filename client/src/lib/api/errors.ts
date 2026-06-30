import { toast } from 'sonner'

import { ApiError } from './client'

export type ApiErrorContext =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'change-password'
  | 'logout'
  | 'generic'

export type ApiErrorToast = {
  title: string
  description: string
}

const CONTEXT_TITLES: Record<ApiErrorContext, string> = {
  login: 'Could not sign in',
  'forgot-password': 'Could not send reset link',
  'reset-password': 'Could not reset password',
  'change-password': 'Could not update password',
  logout: 'Could not sign out',
  generic: 'Something went wrong',
}

export function getApiErrorToast(
  err: unknown,
  context: ApiErrorContext = 'generic',
): ApiErrorToast {
  const title = CONTEXT_TITLES[context]

  if (!(err instanceof ApiError)) {
    // Redux .unwrap() re-throws a SerializedError (plain object) — message is preserved
    if (err && typeof err === 'object' && 'message' in err) {
      const msg = (err as { message: unknown }).message
      if (typeof msg === 'string' && msg && !msg.startsWith('Request failed with status')) {
        return { title, description: msg }
      }
    }
    return { title, description: 'Try again in a moment.' }
  }

  if (err.status >= 500) {
    return { title, description: 'Something went wrong on our end. Try again in a moment.' }
  }

  const description =
    err.message && !err.message.startsWith('Request failed with status')
      ? err.message
      : 'Try again in a moment.'

  return { title, description }
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
  changePasswordSuccess: {
    title: 'Password updated',
    description: 'Your account password has been changed.',
  },
} as const

export function showAuthSuccessToast(
  key: keyof typeof AUTH_TOASTS,
): void {
  const { title, description } = AUTH_TOASTS[key]
  toast.success(title, { description })
}
