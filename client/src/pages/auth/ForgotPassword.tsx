import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, MailCheckIcon } from 'lucide-react'

import AuthShell from '@/components/auth/AuthShell'
import Input from '@/components/reusable/inputs/Input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/lib/validations/auth'
import { authApi } from '@/lib/api/auth.api'
import { showApiErrorToast } from '@/lib/api/errors'

const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true)
    try {
      await authApi.forgotPassword({ email: data.email })
      setSubmitted(true)
    } catch (err) {
      showApiErrorToast(err, 'forgot-password')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AuthShell showLeftPanel={false}>
        <section className="flex w-full flex-col gap-7">
          <div className="flex flex-col items-start gap-4">
            <span className="flex size-10 items-center justify-center border border-field-border text-primary">
              <MailCheckIcon className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-lg text-foreground">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                If that email is registered, you'll receive a password reset link shortly. The
                link expires in 15 minutes.
              </p>
            </div>
          </div>

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

  return (
    <AuthShell showLeftPanel={false}>
      <section className="flex w-full flex-col gap-7">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">Forgot password?</h2>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@tuzahealth.com"
            error={errors.email?.message}
            {...register('email')}
            required
          />

          <Button type="submit" className="h-10 w-full rounded-none" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner data-icon="inline-start" />
                Sending link
              </>
            ) : (
              'Send reset link'
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

export default ForgotPassword
