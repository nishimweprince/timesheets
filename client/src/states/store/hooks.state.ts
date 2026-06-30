import { useDispatch } from "react-redux"
import type { AppDispatch } from "./store"
import { useSelector, type TypedUseSelectorHook } from "react-redux"
import type { RootState } from "./store"

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = useSelector as TypedUseSelectorHook<RootState>