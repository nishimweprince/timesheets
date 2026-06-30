import { describe, expect, it } from 'vitest'
import { DEFAULT_POLICY_RULES } from '@/lib/api/policies.api'
import reducer, { createPolicy, fetchPoliciesPage, updatePolicy } from './policies.slice'

const pageTwoPolicy = {
  id: 'policy-page-2',
  organizationId: 'org-1',
  name: 'Page two policy',
  active: true,
  rules: DEFAULT_POLICY_RULES,
  createdAt: '2026-06-30T00:00:00.000Z',
  updatedAt: '2026-06-30T00:00:00.000Z',
}

const createdPolicy = {
  id: 'policy-new',
  organizationId: 'org-1',
  name: 'New policy',
  active: true,
  rules: DEFAULT_POLICY_RULES,
  createdAt: '2026-06-30T00:00:01.000Z',
  updatedAt: '2026-06-30T00:00:01.000Z',
}

describe('policies.slice write contract (Team page pattern)', () => {
  it('updates lookup on createPolicy.fulfilled without mutating policiesPage.total', () => {
    let state = reducer(undefined, { type: '@@INIT' })

    state = reducer(state, {
      type: fetchPoliciesPage.pending.type,
      meta: { requestId: 'page-2-request' },
    })
    state = reducer(state, {
      type: fetchPoliciesPage.fulfilled.type,
      meta: { requestId: 'page-2-request' },
      payload: {
        data: [pageTwoPolicy],
        total: 11,
        page: 2,
        pageSize: 10,
      },
    })

    const beforeTotal = state.policiesPage.total

    state = reducer(state, {
      type: createPolicy.fulfilled.type,
      payload: createdPolicy,
    })

    expect(state.policies.map((item) => item.id)).toContain('policy-new')
    expect(state.policiesPage.total).toBe(beforeTotal)
    expect(state.policiesPage.page).toBe(2)
  })

  it('replaces page.data only after fetchPoliciesPage refresh (onMutated path)', () => {
    let state = reducer(undefined, { type: '@@INIT' })

    state = reducer(state, {
      type: createPolicy.fulfilled.type,
      payload: createdPolicy,
    })

    state = reducer(state, {
      type: fetchPoliciesPage.pending.type,
      meta: { requestId: 'refresh-page-2' },
    })
    state = reducer(state, {
      type: fetchPoliciesPage.fulfilled.type,
      meta: { requestId: 'refresh-page-2' },
      payload: {
        data: [pageTwoPolicy, createdPolicy],
        total: 12,
        page: 2,
        pageSize: 10,
      },
    })

    expect(state.policiesPage.page).toBe(2)
    expect(state.policiesPage.total).toBe(12)
    expect(state.policiesPage.data.map((item) => item.id)).toEqual(['policy-page-2', 'policy-new'])
  })

  it('upserts the updated policy in lookup and page data without mutating policiesPage.total', () => {
    let state = reducer(undefined, { type: '@@INIT' })

    state = reducer(state, {
      type: fetchPoliciesPage.pending.type,
      meta: { requestId: 'page-2-request' },
    })
    state = reducer(state, {
      type: fetchPoliciesPage.fulfilled.type,
      meta: { requestId: 'page-2-request' },
      payload: {
        data: [pageTwoPolicy],
        total: 11,
        page: 2,
        pageSize: 10,
      },
    })

    const beforeTotal = state.policiesPage.total
    const updatedPolicy = {
      ...pageTwoPolicy,
      name: 'Updated page two policy',
      active: false,
      updatedAt: '2026-06-30T00:00:02.000Z',
    }

    state = reducer(state, {
      type: updatePolicy.fulfilled.type,
      payload: updatedPolicy,
    })

    expect(state.policiesPage.data[0]).toEqual(updatedPolicy)
    expect(state.policies.map((item) => item.id)).toContain('policy-page-2')
    expect(state.policiesPage.total).toBe(beforeTotal)
    expect(state.policiesPage.page).toBe(2)
  })
})