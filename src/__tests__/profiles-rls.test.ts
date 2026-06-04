/**
 * RLS boundary tests for the profiles privacy fix.
 *
 * Uses:
 *   - admin (service role): setup and teardown only
 *   - anon client:          unauthenticated reads
 *   - signed-in clients:    per-user authenticated reads
 *
 * All assertions use anon or signed-in clients, NEVER admin.
 *
 * Run: npx vitest run src/__tests__/profiles-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!url || !serviceKey || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const admin: SupabaseClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anon: SupabaseClient = createClient(url, anonKey, {
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
  const email = `rls-${crypto.randomUUID()}@example.com`
  const password = 'Test1234!'
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'RLS Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser: ${error?.message}`)
  testUserIds.push(data.user.id)
  if (phone) {
    await admin.from('profiles').update({ phone }).eq('id', data.user.id)
  }
  return { id: data.user.id, email, password }
}

let userA: { id: string; email: string; password: string }
let userB: { id: string; email: string; password: string }
let consumer: { id: string; email: string; password: string }
let freelancer: { id: string; email: string; password: string }
let clientA: SupabaseClient
let clientFreelancer: SupabaseClient

beforeAll(async () => {
  userA = await createUser()
  userB = await createUser('+21698765432')
  consumer = await createUser('+21698888888')
  freelancer = await createUser()

  clientA = await signIn(userA.email, userA.password)
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

// ─── profiles: owner-only read ────────────────────────────────────────────────

describe('profiles RLS: owner-only isolation', () => {
  it('anon reads zero rows from profiles', async () => {
    const { data, error } = await anon.from('profiles').select('id, phone, date_of_birth')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('user A cannot read user B phone or date_of_birth', async () => {
    const { data, error } = await clientA
      .from('profiles').select('id, phone, date_of_birth').eq('id', userB.id)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('user A can read their own profile', async () => {
    const { data, error } = await clientA
      .from('profiles').select('id, date_of_birth').eq('id', userA.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(userA.id)
  })
})

// ─── public_profiles: safe fields readable by everyone ────────────────────────

describe('public_profiles: safe fields always readable', () => {
  it('anon can read full_name and city from public_profiles', async () => {
    const { data, error } = await anon
      .from('public_profiles').select('id, full_name, city').eq('id', userB.id)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(userB.id)
  })

  it('public_profiles wildcard does not contain phone or date_of_birth', async () => {
    const { data } = await anon.from('public_profiles').select('*').eq('id', userB.id)
    const row = data?.[0] as Record<string, unknown> | undefined
    expect(row).toBeDefined()
    expect(Object.keys(row!)).not.toContain('phone')
    expect(Object.keys(row!)).not.toContain('date_of_birth')
  })
})

// ─── get_contact_phone: gated by relationship ─────────────────────────────────

describe('get_contact_phone: relationship-gated access', () => {
  it('returns null with no relationship', async () => {
    const { data, error } = await clientA.rpc('get_contact_phone', { target: userB.id })
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('returns phone after job_responses link exists', async () => {
    const { data: post, error: postErr } = await admin
      .from('job_posts').insert({
        consumer_id: consumer.id,
        title: 'RLS test mission',
        description: 'RLS test',
        status: 'open',
      }).select('id').single()
    expect(postErr).toBeNull()
    testPostIds.push(post!.id)

    await admin.from('job_responses').insert({
      job_post_id: post!.id,
      freelancer_id: freelancer.id,
      proposal_message: 'RLS test proposal',
    })

    const { data: phone, error } = await clientFreelancer
      .rpc('get_contact_phone', { target: consumer.id })
    expect(error).toBeNull()
    expect(phone).toBe('+21698888888')
  })
})
