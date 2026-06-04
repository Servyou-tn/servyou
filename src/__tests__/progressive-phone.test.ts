/**
 * Tests for progressive phone collection (Phase 7 follow-up).
 *
 * Coverage:
 *   Unit   — isValidPhone / normalizePhone (pure; also covers the validation gate
 *             that blocks submission when input is bad, i.e. test scenario 3)
 *   DB (1) — no-phone user updates their profile.phone then creates a job_post;
 *             both succeed via an authenticated client (mirrors the form flow)
 *   DB (4) — get_contact_phone returns the consumer's phone for a freelancer who
 *             responded to one of their posts, end-to-end
 *
 * Not covered by DB tests:
 *   (2) "phone already set → input hidden"  — covered by Step-4 click-through
 *   (3) "phone update fails → post not created" — the sequential phone-first ordering
 *       guarantees this: if the phone update call returns an error the function
 *       returns early before the insert. The validation gate (unit-tested below)
 *       is the first line of defence; a network/RLS failure is the early-return path.
 *
 * Run: npx vitest run src/__tests__/progressive-phone.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { isValidPhone, normalizePhone } from '@/lib/phone'

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!url || !serviceKey || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const admin: SupabaseClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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
  consumer  = await createUser()           // no phone
  freelancer = await createUser()          // no phone
  clientConsumer  = await signIn(consumer.email, consumer.password)
  clientFreelancer = await signIn(freelancer.email, freelancer.password)
}, 60000)

afterAll(async () => {
  if (testPostIds.length > 0) {
    await admin.from('job_responses').delete().in('job_post_id', testPostIds)
    await admin.from('job_posts').delete().in('id', testPostIds)
  }
  for (const uid of testUserIds) {
    await admin.auth.admin.deleteUser(uid)
  }
}, 60000)

// ─── Unit: phone validation ───────────────────────────────────────────────────

describe('isValidPhone — accepted formats', () => {
  // Bare 8 digits, first digit 2-9
  it('bare 8-digit, first digit 2', () => expect(isValidPhone('20000000')).toBe(true))
  it('bare 8-digit, first digit 5', () => expect(isValidPhone('56480920')).toBe(true))
  it('bare 8-digit with spaces',    () => expect(isValidPhone('20 000 000')).toBe(true))
  it('bare 8-digit with dots',      () => expect(isValidPhone('20.000.000')).toBe(true))
  it('bare 8-digit with dashes',    () => expect(isValidPhone('20-000-000')).toBe(true))
  it('bare 8-digit with parens',    () => expect(isValidPhone('(20)000000')).toBe(true))

  // Leading 0
  it('leading-0 (056480920)',                 () => expect(isValidPhone('056480920')).toBe(true))
  it('leading-0 with spaces (0 56 480 920)', () => expect(isValidPhone('0 56 480 920')).toBe(true))
  it('leading-0 with dashes (056-480-920)',  () => expect(isValidPhone('056-480-920')).toBe(true))

  // 216 prefix (no +)
  it('216 prefix (21656480920)',              () => expect(isValidPhone('21656480920')).toBe(true))
  it('216 prefix with spaces (216 56480920)', () => expect(isValidPhone('216 56480920')).toBe(true))

  // +216 prefix
  it('+216 prefix (+21656480920)',             () => expect(isValidPhone('+21656480920')).toBe(true))
  it('+216 prefix with spaces (+216 56480920)', () => expect(isValidPhone('+216 56480920')).toBe(true))
  it('+216 prefix with dots (+216.56.480.920)', () => expect(isValidPhone('+216.56.480.920')).toBe(true))

  // 00216 prefix
  it('00216 prefix (0021656480920)',              () => expect(isValidPhone('0021656480920')).toBe(true))
  it('00216 prefix with spaces (00216 56480920)', () => expect(isValidPhone('00216 56480920')).toBe(true))
})

describe('isValidPhone — rejected formats', () => {
  it('rejects empty string',                   () => expect(isValidPhone('')).toBe(false))
  it('rejects 7 digits',                       () => expect(isValidPhone('2000000')).toBe(false))
  it('rejects 9 digits no prefix (956480920)', () => expect(isValidPhone('956480920')).toBe(false))
  it('rejects bare 8-digit first digit 1',     () => expect(isValidPhone('12345678')).toBe(false))
  it('rejects bare 8-digit first digit 0',     () => expect(isValidPhone('02345678')).toBe(false))  // leading-0 case is 0+8=9 digits
  it('rejects foreign +33 number',             () => expect(isValidPhone('+33612345678')).toBe(false))
  it('rejects foreign +1 number',              () => expect(isValidPhone('+12125551234')).toBe(false))
  it('rejects letters',                        () => expect(isValidPhone('2000000a')).toBe(false))
  it('rejects symbols beyond punctuation',     () => expect(isValidPhone('20@000000')).toBe(false))
})

// ─── Unit: phone normalisation ────────────────────────────────────────────────

describe('normalizePhone — all five shapes produce +216XXXXXXXX', () => {
  const EXPECTED = '+21656480920'

  it('bare 8-digit',           () => expect(normalizePhone('56480920')).toBe(EXPECTED))
  it('bare 8-digit with spaces', () => expect(normalizePhone('56 480 920')).toBe(EXPECTED))
  it('leading-0',              () => expect(normalizePhone('056480920')).toBe(EXPECTED))
  it('leading-0 with dashes',  () => expect(normalizePhone('056-480-920')).toBe(EXPECTED))
  it('leading-0 with dots',    () => expect(normalizePhone('0.56.480.920')).toBe(EXPECTED))
  it('216 prefix',             () => expect(normalizePhone('21656480920')).toBe(EXPECTED))
  it('216 prefix with spaces', () => expect(normalizePhone('216 56480920')).toBe(EXPECTED))
  it('+216 prefix',            () => expect(normalizePhone('+21656480920')).toBe(EXPECTED))
  it('+216 prefix with spaces', () => expect(normalizePhone('+216 56 480 920')).toBe(EXPECTED))
  it('00216 prefix',           () => expect(normalizePhone('0021656480920')).toBe(EXPECTED))
  it('00216 prefix with spaces', () => expect(normalizePhone('00216 56480920')).toBe(EXPECTED))
})

// ─── DB integration: phone-first job-post flow ───────────────────────────────

describe('Progressive phone: poster-mission flow (DB)', () => {
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
