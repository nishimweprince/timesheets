import { configureStore } from "@reduxjs/toolkit"
import authReducer from '../features/auth.slice'
import attendanceReducer from '../features/attendance.slice'
import employeeManagementReducer from '../features/employee-management.slice'
import schedulingReducer from '../features/scheduling.slice'
import locationReducer from '../features/location.slice'
import policiesReducer from '../features/policies.slice'
import reportsReducer from '../features/reports.slice'
import { onSessionChange, onSessionClear } from '@/lib/auth-session'
import { clearAuth, setAuth } from '../features/auth.slice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance: attendanceReducer,
    employeeManagement: employeeManagementReducer,
    scheduling: schedulingReducer,
    location: locationReducer,
    policies: policiesReducer,
    reports: reportsReducer,
  },
})

onSessionChange((payload) => {
  store.dispatch(setAuth(payload))
})

onSessionClear(() => {
  store.dispatch(clearAuth())
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
