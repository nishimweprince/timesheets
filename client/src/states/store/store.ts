import { configureStore } from "@reduxjs/toolkit"
import authReducer from '../features/auth.slice'
import attendanceReducer from '../features/attendance.slice'
import schedulingReducer from '../features/scheduling.slice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance: attendanceReducer,
    scheduling: schedulingReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
