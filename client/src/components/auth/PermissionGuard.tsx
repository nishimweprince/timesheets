import { Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/states/store/hooks.state'

const PermissionGuard = ({ permission }: { permission: string }) => {
  const permissions = useAppSelector((state) => state.auth.user?.permissions ?? [])

  if (!permissions.includes(permission)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default PermissionGuard
