import { useNavigate } from 'react-router-dom'
import { LogOutIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { authApi } from '@/lib/api/auth.api'
import { showApiErrorToast, showAuthSuccessToast } from '@/lib/api/errors'
import { clearAuth } from '@/states/features/auth.slice'
import { useAppDispatch, useAppSelector } from '@/states/store/hooks.state'

const Dashboard = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)

  const handleLogout = async () => {
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

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Tuza Health</p>
        <h1 className="text-2xl font-semibold text-foreground">Welcome to Tuza Health Timesheets</h1>
        {user && (
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{user.email}</span>
          </p>
        )}
      </div>

      <Button variant="outline" onClick={handleLogout}>
        <LogOutIcon data-icon="inline-start" />
        Sign out
      </Button>
    </div>
  )
}

export default Dashboard
