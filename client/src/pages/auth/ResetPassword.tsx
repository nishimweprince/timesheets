import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeftIcon, EyeIcon, EyeOffIcon } from 'lucide-react'

import AuthShell from '@/components/auth/AuthShell'
import Input from '@/components/reusable/inputs/Input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validations/auth'
import { authApi } from '@/lib/api/auth.api'
import { showApiErrorToast, showAuthSuccessToast } from '@/lib/api/errors'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  if (!token) {
    return <Navigate to="/auth/forgot-password" replace />
  }

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true)
    try {
      await authApi.resetPassword({ token, password: data.password })
      showAuthSuccessToast('resetPasswordSuccess')
      setTimeout(() => navigate('/auth/login', { replace: true }), 1500)
    } catch (err) {
      showApiErrorToast(err, 'reset-password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell showLeftPanel={false}>
      <section className="flex w-full flex-col gap-7">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">Set new password</h2>
          <p className="text-sm text-muted-foreground">
            Choose a strong password for your Tuza Health account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <Input
              label="New password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              error={errors.password?.message}
              required
              suffix={
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              }
              {...register('password')}
            />

            <Input
              label="Confirm password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your password"
              error={errors.confirmPassword?.message}
              required
              suffix={
                <button
                  type="button"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/30"
                >
                  {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              }
              {...register('confirmPassword')}
            />
          </div>

          <Button type="submit" className="h-10 w-full rounded-none" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner data-icon="inline-start" />
                Resetting password
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </form>

        <Button variant="outline" className="w-full" asChild>
          <Link to="/auth/login">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to sign in
          </Link>
        </Button>
      </section>
    </AuthShell>
  )
}

export default ResetPassword
