import type { PaginatedResult, PaginationParams } from './pagination'

export function paginateList<T>(items: T[], params?: PaginationParams): PaginatedResult<T> {
  const page = Math.max(1, params?.page ?? 1)
  const pageSize = Math.max(1, params?.pageSize ?? 10)
  const start = (page - 1) * pageSize

  return {
    data: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  }
}