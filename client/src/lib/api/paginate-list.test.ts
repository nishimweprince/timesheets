import { describe, expect, it } from 'vitest'
import { paginateList } from './paginate-list'

describe('paginateList', () => {
  const items = Array.from({ length: 12 }, (_, index) => ({ id: `policy-${index + 1}` }))

  it('returns the requested page slice and total count', () => {
    const page = paginateList(items, { page: 2, pageSize: 5 })

    expect(page.total).toBe(12)
    expect(page.page).toBe(2)
    expect(page.pageSize).toBe(5)
    expect(page.data.map((item) => item.id)).toEqual([
      'policy-6',
      'policy-7',
      'policy-8',
      'policy-9',
      'policy-10',
    ])
  })
})