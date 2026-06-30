import { Navigate, Route, Routes } from 'react-router-dom'

import AuthGuard from '@/components/auth/AuthGuard'
import GuestGuard from '@/components/auth/GuestGuard'
import ForgotPassword from '../pages/auth/ForgotPassword'
import Login from '../pages/auth/Login'
import ResetPassword from '../pages/auth/ResetPassword'
import Dashboard from '../pages/Dashboard'

const Router = () => {
  return (
    <Routes>
      <Route element={<GuestGuard />}>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<AuthGuard />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  )
}

export default Router
