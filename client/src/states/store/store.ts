import { configureStore } from "@reduxjs/toolkit"
import authReducer from '../features/auth.slice'
import attendanceReducer from '../features/attendance.slice'
import employeeManagementReducer from '../features/employee-management.slice'
import schedulingReducer from '../features/scheduling.slice'
import locationReducer from '../features/location.slice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance: attendanceReducer,
    employeeManagement: employeeManagementReducer,
    scheduling: schedulingReducer,
    location: locationReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
