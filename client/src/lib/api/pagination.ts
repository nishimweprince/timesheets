export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export function toQueryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}
