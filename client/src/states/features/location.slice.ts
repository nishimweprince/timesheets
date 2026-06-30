import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface LocationCoords {
  latitude: number
  longitude: number
  accuracy: number
  capturedAt: string
}

interface LocationState {
  coords: LocationCoords | null
}

const initialState: LocationState = {
  coords: null,
}

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation(state, action: PayloadAction<LocationCoords>) {
      state.coords = action.payload
    },
    clearLocation(state) {
      state.coords = null
    },
  },
})

export const { setLocation, clearLocation } = locationSlice.actions
export default locationSlice.reducer
