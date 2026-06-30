import { beforeAll, describe, expect, it } from 'vitest'
import {
  DEFAULT_POLICY_RULES,
  PolicyAssignmentScope,
} from '@/lib/api/policies.api'
import { store } from '../store/store'
import type { TokenResponse } from '@/lib/auth-session'
import { setAuth } from './auth.slice'
import {
  assignPolicy,
  createPolicy,
  createWorkSite,
  fetchPoliciesPage,
} from './policies.slice'

const API_BASE = process.env.VITE_API_URL ?? 'http://localhost:3000'
const RUN_LIVE = process.env.POLICIES_LIVE_PROBE === '1'

function installLocalStorageMock() {
  const storage = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value)
    },
    removeItem: (key) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    },
    key: () => null,
    get length() {
      return storage.size
    },
  }
}

describe.runIf(RUN_LIVE)('policies live store integration', () => {
  beforeAll(async () => {
    installLocalStorageMock()

    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@tuza.local', password: 'ChangeMe123!' }),
    })

    expect(response.ok).toBe(true)
    const payload = (await response.json()) as TokenResponse
    store.dispatch(setAuth(payload))
  })

  it('drives create, assign, and work-site flows through shipped thunks', async () => {
    const suffix = Date.now()
    const policyName = `Store probe policy ${suffix}`
    const siteName = `Store probe clinic ${suffix}`

    await store.dispatch(fetchPoliciesPage({ page: 1, pageSize: 10 }))
    const totalBefore = store.getState().policies.policiesPage.total
    console.log('[policies-live] policiesPage.total before create:', totalBefore)

    const createdPolicy = await store
      .dispatch(
        createPolicy({
          name: policyName,
          rules: { ...DEFAULT_POLICY_RULES, requireClockInPhoto: true },
        }),
      )
      .unwrap()

    console.log('[policies-live] createPolicy id:', createdPolicy.id)
    console.log('[policies-live] lookup policies count:', store.getState().policies.policies.length)

    const assignment = await store
      .dispatch(
        assignPolicy({
          policyId: createdPolicy.id,
          scope: PolicyAssignmentScope.ORGANIZATION,
        }),
      )
      .unwrap()

    console.log('[policies-live] assignPolicy id:', assignment.id)
    console.log('[policies-live] assignments lookup count:', store.getState().policies.assignments.length)

    const workSite = await store
      .dispatch(createWorkSite({ name: siteName, timezone: 'America/Chicago' }))
      .unwrap()

    console.log('[policies-live] createWorkSite id:', workSite.id)

    await store.dispatch(fetchPoliciesPage({ page: 1, pageSize: 10 }))
    const totalAfterRefresh = store.getState().policies.policiesPage.total
    console.log('[policies-live] policiesPage.total after refresh:', totalAfterRefresh)

    expect(createdPolicy.id).toBeTruthy()
    expect(store.getState().policies.policies.some((item) => item.id === createdPolicy.id)).toBe(true)
    expect(assignment.policyId).toBe(createdPolicy.id)
    expect(workSite.name).toBe(siteName)
    expect(totalAfterRefresh).toBeGreaterThanOrEqual(totalBefore)
  })
})