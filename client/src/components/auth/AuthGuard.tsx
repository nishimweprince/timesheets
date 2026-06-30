import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/states/store/hooks.state'

const AuthGuard = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export default AuthGuard
