import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, MailCheckIcon } from 'lucide-react'
import { toast } from 'sonner'

import AuthShell from '@/components/auth/AuthShell'
import Input from '@/components/reusable/inputs/Input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { employeeManagementApi, type InvitationPreview } from '@/lib/api/employee-management.api'
import { showApiErrorToast } from '@/lib/api/errors'

const Onboarding = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    employeeManagementApi.previewInvitation(token)
      .then((data) => {
        setPreview(data)
        setFirstName(data.firstName)
        setLastName(data.lastName)
        setError(null)
      })
      .catch(() => {
        setError('This invitation link is invalid or expired.')
      })
      .finally(() => setIsLoading(false))
  }, [token])

  if (!token) {
    return <Navigate to="/auth/login" replace />
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await employeeManagementApi.acceptInvitation({ token, password, firstName, lastName })
      toast.success('Account ready', { description: 'Sign in with your new password.' })
      setTimeout(() => navigate('/auth/login', { replace: true }), 1000)
    } catch (err) {
      showApiErrorToast(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell showLeftPanel={false}>
      <section className="flex w-full flex-col gap-7">
        <div className="flex flex-col gap-1">
          <div className="mb-2 flex size-10 items-center justify-center border border-primary/20 bg-primary/10 text-primary">
            <MailCheckIcon className="size-5" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Set up your account</h2>
          <p className="text-sm text-muted-foreground">
            {preview
              ? `Join ${preview.organizationName} and finish your employee profile.`
              : 'Validate your invitation and choose a password.'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            Checking invitation
          </div>
        ) : error && !preview ? (
          <div className="border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            {preview ? (
              <div className="border border-border bg-muted/30 p-3 text-sm">
                <div className="text-xs tracking-[0.12em] text-muted-foreground uppercase">Invitation</div>
                <div className="mt-1 font-medium">{preview.email}</div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
              <Input
                label="Last name"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </div>

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
            />

            <Input
              label="Confirm password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            />

            {error ? (
              <div className="border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="h-10 w-full rounded-none" disabled={isSubmitting || !preview}>
              {isSubmitting ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Creating account
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>
        )}

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

export default Onboarding
