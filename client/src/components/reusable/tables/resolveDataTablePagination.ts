/**
 * Pure functions for DataTable pagination resolution.
 * Extracted per restructuring to eliminate render-time side effects, force effects,
 * and shared-payload cross-talk inside the component.
 *
 * Rules for effective pageSize (per strategist spec + ACs):
 *   Use info.pageSize ONLY when:
 *     - info is "real" (total > 0 and info page index matches base page index)
 *     - AND ( base.pageSize === info.pageSize OR (justFinishedFetch && sizeWhenFetchStarted === info.pageSize) )
 *   Otherwise keep base.pageSize.
 *
 * This scopes "adoption" of backend returned size to *this instance's* just-completed request,
 * solving cross-consumer (shared history) and user-choice snap problems.
 */

export function derivePageCount(info?: { pageCount?: number; total?: number; pageSize?: number }): number {
  if (!info) return 1;
  if (info.pageCount != null) return info.pageCount;
  return Math.max(1, Math.ceil((info.total || 0) / Math.max(1, info.pageSize || 1)));
}

export interface BasePagination {
  pageIndex: number;
  pageSize: number;
}

export interface PaginationInfoShape {
  page: number;
  pageSize: number;
  total: number;
  pageCount?: number;
}

export interface ResolveEffectivePaginationInput {
  base: BasePagination;
  info?: PaginationInfoShape;
  isPending: boolean;
  justFinishedFetch: boolean;
  sizeWhenFetchStarted: number | null;
}

export interface EffectivePaginationResult {
  pageIndex: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Pure resolver. No refs, no effects, deterministic.
 */
export function resolveEffectivePagination(
  input: ResolveEffectivePaginationInput
): EffectivePaginationResult {
  const { base, info, isPending, justFinishedFetch, sizeWhenFetchStarted } = input;

  let pageSize = base.pageSize;

  if (info && !isPending && (info.total || 0) > 0) {
    const infoPageIndex = Math.max(info.page - 1, 0);
    if (infoPageIndex === base.pageIndex) {
      const matchesBase = base.pageSize === info.pageSize;
      const matchesJustFinished = justFinishedFetch && sizeWhenFetchStarted === info.pageSize;
      if (matchesBase || matchesJustFinished) {
        pageSize = info.pageSize;
      }
    }
  }

  const pageCount = info
    ? (info.pageCount ?? Math.max(1, Math.ceil((info.total || 0) / Math.max(1, info.pageSize || 1))))
    : Math.max(1, 1); // when no info, at least 1 page

  return {
    pageIndex: base.pageIndex,
    pageSize,
    pageCount,
  };
}
