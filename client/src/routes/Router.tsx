import { Navigate, Route, Routes } from 'react-router-dom'

import AuthGuard from '@/components/auth/AuthGuard'
import GuestGuard from '@/components/auth/GuestGuard'
import LocationGuard from '@/components/auth/LocationGuard'
import ForgotPassword from '../pages/auth/ForgotPassword'
import Login from '../pages/auth/Login'
import Onboarding from '../pages/auth/Onboarding'
import ResetPassword from '../pages/auth/ResetPassword'
import Dashboard from '../pages/Dashboard'
import Timesheets from '../pages/timesheets/Timesheets'
import Scheduling from '../pages/scheduling/Scheduling'
import Team from '../pages/team/Team'

const Router = () => {
  return (
    <Routes>
      <Route element={<GuestGuard />}>
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/onboarding" element={<Onboarding />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
      </Route>

      <Route element={<AuthGuard />}>
        <Route element={<LocationGuard />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/timesheets" element={<Timesheets />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/team" element={<Team />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  )
}

export default Router
