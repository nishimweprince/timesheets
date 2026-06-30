import * as React from 'react'
import { useNavigate } from 'react-router-dom'

import { Spinner } from '@/components/ui/spinner'
import { authApi } from '@/lib/api/auth.api'
import { showApiErrorToast, showAuthSuccessToast } from '@/lib/api/errors'
import { clearAuth } from '@/states/features/auth.slice'
import { useAppDispatch } from '@/states/store/hooks.state'

const Signout = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const hasStartedRef = React.useRef(false)

  React.useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const signOut = async () => {
      try {
        await authApi.logout()
        showAuthSuccessToast('logoutSuccess')
      } catch (err) {
        showApiErrorToast(err, 'logout')
      } finally {
        dispatch(clearAuth())
        navigate('/auth/login', { replace: true })
      }
    }

    void signOut()
  }, [dispatch, navigate])

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <section className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex size-12 items-center justify-center border border-primary/20 bg-primary/8">
          <Spinner className="size-5 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Signing you out
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            We are closing your session securely. This will only take a moment.
          </p>
        </div>
      </section>
    </main>
  )
}

export default Signout
