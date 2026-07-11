import { Navigate, Route, Routes } from 'react-router-dom'

import AuthGuard from '@/components/auth/AuthGuard'
import GuestGuard from '@/components/auth/GuestGuard'
import LocationGuard from '@/components/auth/LocationGuard'
import PermissionGuard from '@/components/auth/PermissionGuard'
import ForgotPassword from '../pages/auth/ForgotPassword'
import Login from '../pages/auth/Login'
import Onboarding from '../pages/auth/Onboarding'
import ResetPassword from '../pages/auth/ResetPassword'
import Signout from '../pages/auth/Signout'
import Dashboard from '../pages/Dashboard'
import Timesheets from '../pages/timesheets/Timesheets'
import Scheduling from '../pages/scheduling/Scheduling'
import ClockInDetailPage from '../pages/scheduling/ClockInDetailPage'
import Team from '../pages/team/Team'
import Policies from '../pages/policies/Policies'
import Reports from '../pages/reports/Reports'
import AttendanceReview from '../pages/reports/AttendanceReview'
import ExceptionQueuePage from '../pages/reports/ExceptionQueuePage'
import ExceptionDetailPage from '../pages/reports/ExceptionDetailPage'
import Profile from '../pages/profile/Profile'

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
        <Route path="/auth/signout" element={<Signout />} />
        <Route element={<PermissionGuard permission="policy.read" />}>
          <Route path="/policies" element={<Policies tab="policies" />} />
          <Route path="/policies/work-sites" element={<Policies tab="work-sites" />} />
        </Route>
        <Route element={<PermissionGuard permission="report.read" />}>
          <Route path="/reports" element={<Reports tab="hours" />} />
          <Route path="/reports/exceptions" element={<Reports tab="exceptions" />} />
        </Route>
        <Route element={<LocationGuard />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/timesheets" element={<Timesheets />} />
          <Route path="/profile" element={<Profile />} />
          {/* Attendance review + exception queue: page access for managers; mutations enforced by API. */}
          <Route path="/reports/review" element={<AttendanceReview />} />
          <Route path="/reports/exception-queue" element={<ExceptionQueuePage />} />
          <Route path="/reports/exception-queue/:exceptionId" element={<ExceptionDetailPage />} />
          <Route element={<PermissionGuard permission="shift.create" />}>
            <Route path="/scheduling" element={<Scheduling view="coverage" />} />
            <Route path="/scheduling/clock-ins" element={<Scheduling view="clock-ins" />} />
            <Route path="/scheduling/clock-ins/:sessionId" element={<ClockInDetailPage />} />
            <Route path="/scheduling/shifts" element={<Scheduling view="shifts" />} />
            <Route path="/scheduling/assignments" element={<Scheduling view="assignments" />} />
          </Route>
          <Route element={<PermissionGuard permission="employee.read" />}>
            <Route path="/team" element={<Team tab="employees" />} />
            <Route path="/team/teams" element={<Team tab="teams" />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  )
}

export default Router
