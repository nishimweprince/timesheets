import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/states/store/hooks.state'

const GuestGuard = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default GuestGuard
