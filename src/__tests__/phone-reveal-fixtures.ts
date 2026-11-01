/**
 * Shared fixtures for the phone-reveal live suites (db/migrations/20261101181237_phone_reveal_rule.sql — get_contact_phone):
 * a buyer / mission owner (X), a shop owner (S) with one product, a freelancer (F) who sent a proposal on X's open
 * mission. Every row is written by the service role; each suite signs in ONCE, as the side it tests.
 *
 * Order scenarios are staged by the service role: the order is INSERTED in the wanted status (the status-transition
 * trigger refuses a service-role update), and its acceptance history is written straight into order_events — the
 * same rows trg_emit_order_event writes for a real transition.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
export const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const hasCreds = Boolean(url && serviceKey && anonKey)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
export const opts = { auth: { autoRefreshToken: false, persistSession: false } }
export const admin: SupabaseClient = hasCreds ? createClient(url, serviceKey, opts) : (undefined as unknown as SupabaseClient)

export const PHONES = { buyer: '+21620000001', seller: '+21620000002', freelancer: '+21620000003' } as const

export type Fixture = { prefix: string; buyerId: string; sellerId: string; freelancerId: string; productId: string; postId: string }

export const email = (prefix: string, local: string) => `${prefix}${local}${EMAIL_SUFFIX}`

async function createUser(prefix: string, local: string, phone: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(prefix, local),
    password: `Ph-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: 'Phone Reveal Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  const { error: upErr } = await admin.from('profiles').update({ phone }).eq('id', data.user.id)
  if (upErr) throw new Error(`phone update failed: ${upErr.message}`)
  return data.user.id
}

export async function teardown(prefix: string): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${prefix}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id as string)
  await refuseTeardownOnForeignOrders(admin as never, ids, prefix)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

export async function remaining(prefix: string): Promise<number> {
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${prefix}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  return count ?? 0
}

export async function setup(prefix: string): Promise<Fixture> {
  await teardown(prefix)
  const run = randomUUID().slice(0, 8)
  const buyerId = await createUser(prefix, 'buyer', PHONES.buyer)
  const sellerId = await createUser(prefix, 'seller', PHONES.seller)
  const freelancerId = await createUser(prefix, 'freelancer', PHONES.freelancer)

  const { error: sErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', sellerId)
  if (sErr) throw new Error(`seller upgrade failed: ${sErr.message}`)
  const { data: shop, error: shopErr } = await admin.from('shops').insert({ owner_id: sellerId, name: `Phone Reveal ${run}` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  const { data: product, error: pErr } = await admin
    .from('products').insert({ shop_id: shop.id, title: `Phone Reveal ${run}`, price_tnd: 10, status: 'active' }).select('id').single()
  if (pErr || !product) throw new Error(`product insert failed: ${pErr?.message}`)

  const { error: fErr } = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', freelancerId)
  if (fErr) throw new Error(`freelancer upgrade failed: ${fErr.message}`)
  const { error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: freelancerId })
  if (fpErr) throw new Error(`freelancer profile insert failed: ${fpErr.message}`)
  const { data: post, error: postErr } = await admin
    .from('job_posts').insert({ consumer_id: buyerId, title: `Phone Reveal ${run}`, description: 'Mission de test', status: 'open' }).select('id').single()
  if (postErr || !post) throw new Error(`job post insert failed: ${postErr?.message}`)
  const { error: rErr } = await admin
    .from('job_responses').insert({ job_post_id: post.id, freelancer_id: freelancerId, proposal_message: 'Bonjour, je suis disponible pour cette mission de test.' })
  if (rErr) throw new Error(`job response insert failed: ${rErr.message}`)

  return { prefix, buyerId, sellerId, freelancerId, productId: product.id as string, postId: post.id as string }
}

/** Order scenarios: the status, and the acceptance history order_events must hold. */
export type Scenario = { label: string; status: string; history: 'none' | 'cancelled-from-pending' | 'cancelled-after-accepted' | 'cancelled-after-dispatched' | 'no-events' }

export const SCENARIOS: Scenario[] = [
  { label: 'pending', status: 'pending', history: 'none' },
  { label: 'accepted', status: 'accepted', history: 'none' },
  { label: 'prepared', status: 'prepared', history: 'none' },
  { label: 'dispatched', status: 'dispatched', history: 'none' },
  { label: 'in_delivery', status: 'in_delivery', history: 'none' },
  { label: 'arrived', status: 'arrived', history: 'none' },
  { label: 'received', status: 'received', history: 'none' },
  { label: 'cancelled while pending', status: 'cancelled', history: 'cancelled-from-pending' },
  { label: 'cancelled after acceptance', status: 'cancelled', history: 'cancelled-after-accepted' },
  { label: 'cancelled after dispatch', status: 'cancelled', history: 'cancelled-after-dispatched' },
  { label: 'cancelled, pre-events order (no history)', status: 'cancelled', history: 'no-events' },
]

/** Replaces every order between X and S with one order in this scenario. */
export async function stage(fx: Fixture, sc: Scenario): Promise<void> {
  const { error: delErr } = await admin.from('orders').delete().eq('buyer_id', fx.buyerId).eq('seller_id', fx.sellerId)
  if (delErr) throw new Error(`order cleanup failed: ${delErr.message}`)
  const cancelled = sc.status === 'cancelled'
  const { data: order, error } = await admin
    .from('orders')
    .insert({
      buyer_id: fx.buyerId,
      seller_id: fx.sellerId,
      order_type: 'product',
      product_id: fx.productId,
      status: sc.status,
      cancelled_by: cancelled ? 'seller' : null,
      cancelled_at: cancelled ? new Date().toISOString() : null,
    })
    .select('id')
    .single()
  if (error || !order) throw new Error(`order insert failed (${sc.label}): ${error?.message}`)

  const events: { from_status: string; to_status: string }[] =
    sc.history === 'cancelled-from-pending'
      ? [{ from_status: 'pending', to_status: 'cancelled' }]
      : sc.history === 'cancelled-after-accepted'
        ? [{ from_status: 'pending', to_status: 'accepted' }, { from_status: 'accepted', to_status: 'cancelled' }]
        : sc.history === 'cancelled-after-dispatched'
          ? [{ from_status: 'prepared', to_status: 'dispatched' }, { from_status: 'dispatched', to_status: 'cancelled' }]
          : []
  if (sc.history === 'no-events') {
    const { error: evDel } = await admin.from('order_events').delete().eq('order_id', order.id)
    if (evDel) throw new Error(`event cleanup failed: ${evDel.message}`)
  }
  if (events.length) {
    const { error: evErr } = await admin
      .from('order_events')
      .insert(events.map((e) => ({ order_id: order.id, event_type: 'status_change', actor_role: 'system', ...e })))
    if (evErr) throw new Error(`event insert failed (${sc.label}): ${evErr.message}`)
  }
}

export async function clearOrders(fx: Fixture): Promise<void> {
  const { error } = await admin.from('orders').delete().eq('buyer_id', fx.buyerId).eq('seller_id', fx.sellerId)
  if (error) throw new Error(`order cleanup failed: ${error.message}`)
}
