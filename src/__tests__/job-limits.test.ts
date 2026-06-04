/**
 * Integration tests for the check_job_response_limits() trigger.
 *
 * Requires env vars (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (used only here for test setup/teardown — never in browser code)
 *
 * Run: npx vitest run src/__tests__/job-limits.test.ts
 *
 * The service role client bypasses RLS so we can create/delete test data freely.
 * The trigger still fires on every INSERT into job_responses regardless of the client role.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { MAX_RESPONSES_PER_POST, MAX_ACTIVE_RESPONSES_PER_FREELANCER } from '@/lib/job-constants'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
}

const admin: SupabaseClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// IDs collected during setup for teardown
const testUserIds: string[] = []
const testPostIds: string[] = []

async function createTestUser(): Promise<string> {
  const email = `test-${crypto.randomUUID()}@example.com`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'Test1234!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User',
      date_of_birth: '1990-01-01',
      city: 'Tunis',
      language: 'fr',
    },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  testUserIds.push(data.user.id)
  return data.user.id
}

async function createTestPost(consumerId: string): Promise<string> {
  const { data, error } = await admin.from('job_posts').insert({
    consumer_id: consumerId,
    title: 'Test mission',
    description: 'Test description',
    status: 'open',
  }).select('id').single()
  if (error || !data) throw new Error(`createPost failed: ${error?.message}`)
  testPostIds.push(data.id)
  return data.id
}

async function tryRespond(freelancerId: string, postId: string): Promise<{ ok: boolean; msg: string }> {
  const { error } = await admin.from('job_responses').insert({
    job_post_id: postId,
    freelancer_id: freelancerId,
    proposal_message: 'Test proposal',
  })
  return { ok: !error, msg: error?.message ?? '' }
}

let consumerId: string
let freelancerId: string

beforeAll(async () => {
  consumerId = await createTestUser()
  freelancerId = await createTestUser()
}, 60000)

afterAll(async () => {
  // Clean up responses, then posts, then users
  if (testPostIds.length > 0) {
    await admin.from('job_responses').delete().in('job_post_id', testPostIds)
    await admin.from('job_post_skills').delete().in('job_post_id', testPostIds)
    await admin.from('job_posts').delete().in('id', testPostIds)
  }
  for (const uid of testUserIds) {
    await admin.auth.admin.deleteUser(uid)
  }
}, 60000)

describe('Trigger: self-response blocked', () => {
  it('consumer cannot respond to their own post', async () => {
    const postId = await createTestPost(consumerId)
    const { ok, msg } = await tryRespond(consumerId, postId)
    expect(ok).toBe(false)
    expect(msg).toMatch(/propre annonce/)
  })
})

describe('Trigger: duplicate response blocked', () => {
  it('second response to the same post is rejected', async () => {
    const postId = await createTestPost(consumerId)
    const first = await tryRespond(freelancerId, postId)
    expect(first.ok).toBe(true)

    const second = await tryRespond(freelancerId, postId)
    expect(second.ok).toBe(false)
    expect(second.msg).toMatch(/déjà répondu/)
  })
})

describe(`Trigger: max ${MAX_RESPONSES_PER_POST} responses per post`, () => {
  it(`${MAX_RESPONSES_PER_POST + 1}th response is rejected`, async () => {
    const postId = await createTestPost(consumerId)

    // Create MAX_RESPONSES_PER_POST distinct freelancers and have each respond
    const extraFreelancers: string[] = []
    for (let i = 0; i < MAX_RESPONSES_PER_POST; i++) {
      const fid = await createTestUser()
      extraFreelancers.push(fid)
      const { ok } = await tryRespond(fid, postId)
      expect(ok, `Response ${i + 1} should succeed`).toBe(true)
    }

    // One more freelancer — should be rejected
    const overLimitFreelancer = await createTestUser()
    const { ok, msg } = await tryRespond(overLimitFreelancer, postId)
    expect(ok).toBe(false)
    expect(msg).toMatch(/nombre maximum de réponses/)
  }, 120000)
})

describe(`Trigger: max ${MAX_ACTIVE_RESPONSES_PER_FREELANCER} active responses per freelancer`, () => {
  it(`${MAX_ACTIVE_RESPONSES_PER_FREELANCER + 1}th active response is rejected`, async () => {
    const busyFreelancer = await createTestUser()

    // Create MAX_ACTIVE_RESPONSES_PER_FREELANCER open posts from different consumers and respond
    for (let i = 0; i < MAX_ACTIVE_RESPONSES_PER_FREELANCER; i++) {
      const c = await createTestUser()
      const postId = await createTestPost(c)
      const { ok } = await tryRespond(busyFreelancer, postId)
      expect(ok, `Active response ${i + 1} should succeed`).toBe(true)
    }

    // One more open post
    const c2 = await createTestUser()
    const overPostId = await createTestPost(c2)
    const { ok, msg } = await tryRespond(busyFreelancer, overPostId)
    expect(ok).toBe(false)
    expect(msg).toMatch(/nombre maximum de réponses actives/)
  }, 120000)
})

describe('Trigger: filled/expired post response does NOT count toward active cap', () => {
  it('response on a filled post is excluded from active count', async () => {
    const capFreelancer = await createTestUser()

    // Fill MAX_ACTIVE_RESPONSES_PER_FREELANCER posts but mark them filled immediately after responding
    for (let i = 0; i < MAX_ACTIVE_RESPONSES_PER_FREELANCER; i++) {
      const c = await createTestUser()
      const postId = await createTestPost(c)
      const { ok } = await tryRespond(capFreelancer, postId)
      expect(ok, `Response ${i + 1} should succeed`).toBe(true)
      // Mark post as filled — response no longer active
      await admin.from('job_posts').update({ status: 'filled' }).eq('id', postId)
    }

    // Now freelancer should be able to respond to a new open post (active count = 0)
    const c3 = await createTestUser()
    const newPostId = await createTestPost(c3)
    const { ok } = await tryRespond(capFreelancer, newPostId)
    expect(ok, 'Should succeed since filled posts do not count as active').toBe(true)
  }, 120000)
})
