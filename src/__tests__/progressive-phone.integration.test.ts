/**
 * Live-DB integration tests for progressive phone collection (Phase 7 follow-up).
 *
 *   DB (1) — no-phone user updates their profile.phone then creates a job_post;
 *             both succeed via an authenticated client (mirrors the form flow)
 *   DB (4) — get_contact_phone returns the consumer's phone for a freelancer who
 *             responded to one of their posts, end-to-end
 *
 * The pure isValidPhone/normalizePhone unit tests live in progressive-phone.test.ts.
 *
 * Run: `npm run test:integration` (needs Supabase creds in .env.local). When creds
 * are absent the suite skips cleanly (describe.skipIf) — no throw.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Creds are injected via loadEnv/.env.local. Absent in CI / credential-less runs by
// design — describe.skipIf(!hasCreds) skips the suite and the hooks no-op, so nothing
// throws. (Re-reads process.env so the ! assertions above don't mask a genuine check.)
const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

function freshAnonClient() {
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function signIn(email: string, password: string): Promise<SupabaseClient> {
  const client = freshAnonClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn failed: ${error.message}`)
  return client
}

const testUserIds: string[] = []
const testPostIds: string[] = []

async function createUser(phone?: string): Promise<{ id: string; email: string; password: string }> {
  const email = `phone-test-${crypto.randomUUID()}@example.com`
  const password = 'Test1234!'
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Phone Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`)
  testUserIds.push(data.user.id)
  if (phone) {
    await admin.from('profiles').update({ phone }).eq('id', data.user.id)
  }
  return { id: data.user.id, email, password }
}

let consumer: { id: string; email: string; password: string }
let freelancer: { id: string; email: string; password: string }
let clientConsumer: SupabaseClient
let clientFreelancer: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  consumer  = await createUser()           // no phone
  freelancer = await createUser()          // no phone
  clientConsumer  = await signIn(consumer.email, consumer.password)
  clientFreelancer = await signIn(freelancer.email, freelancer.password)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  if (testPostIds.length > 0) {
    await admin.from('job_responses').delete().in('job_post_id', testPostIds)
    await admin.from('job_posts').delete().in('id', testPostIds)
  }
  for (const uid of testUserIds) {
    await admin.auth.admin.deleteUser(uid)
  }
}, 60000)

// ─── DB integration: phone-first job-post flow ───────────────────────────────

describe.skipIf(!hasCreds)('Progressive phone: poster-mission flow (DB)', () => {
  it('(1) no-phone user: profile.phone is set AND job_post is created', async () => {
    // Confirm user starts with no phone
    const { data: before } = await admin
      .from('profiles').select('phone').eq('id', consumer.id).single()
    expect(before?.phone).toBeNull()

    // Step 1: authenticated client updates own phone (mirrors the form's phone-first write)
    const { error: phoneErr } = await clientConsumer
      .from('profiles')
      .update({ phone: '+21620000099' })
      .eq('id', consumer.id)
    expect(phoneErr).toBeNull()

    // Step 2: authenticated client creates a job_post (mirrors form's main write)
    const { data: post, error: postErr } = await clientConsumer
      .from('job_posts')
      .insert({
        consumer_id: consumer.id,
        title: 'Test phone-collection mission',
        description: 'Integration test post',
        status: 'open',
      })
      .select('id')
      .single()
    expect(postErr).toBeNull()
    expect(post).not.toBeNull()
    testPostIds.push(post!.id)

    // Verify profile.phone is now set
    const { data: after } = await admin
      .from('profiles').select('phone').eq('id', consumer.id).single()
    expect(after?.phone).toBe('+21620000099')
  })

  it('(4) get_contact_phone returns consumer phone end-to-end after job_response link', async () => {
    // Use the post created in test (1) — consumer now has a phone
    const postId = testPostIds[0]
    expect(postId).toBeDefined()

    // Freelancer responds
    const { error: respErr } = await admin.from('job_responses').insert({
      job_post_id: postId,
      freelancer_id: freelancer.id,
      proposal_message: 'Integration test response',
    })
    expect(respErr).toBeNull()

    // Freelancer can now get the consumer's phone via get_contact_phone
    const { data: phone, error } = await clientFreelancer
      .rpc('get_contact_phone', { target: consumer.id })
    expect(error).toBeNull()
    expect(phone).toBe('+21620000099')

    // Consumer can get the freelancer's phone — but freelancer has no phone yet, so NULL
    const { data: phoneRev } = await clientConsumer
      .rpc('get_contact_phone', { target: freelancer.id })
    expect(phoneRev).toBeNull()
  })
})
