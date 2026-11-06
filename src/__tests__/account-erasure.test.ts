/**
 * Unit tests for src/lib/admin/account-erasure.ts against a fake service-role client: the guard fails closed, the
 * order of the steps (files removed BEFORE their provenance rows, so a retry still finds them), the folder sweep's
 * scope (a shop the RPC already deleted is swept; a shop that belongs to someone else never is), the depth limit, and
 * an OAuth identity never reported as « done ». The real GoTrue / Storage behaviour is proven live in
 * admin-requests-live.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const USER = '22222222-2222-4222-8222-222222222222'
const SHOP = 'aaaaaaaa-0000-4000-8000-000000000001'
const GONE_SHOP = 'aaaaaaaa-0000-4000-8000-000000000002'
const TOMBSTONE = `supprime-${USER}@deleted.servyou.invalid`

type Filter = [op: string, column: string, value: unknown]
type Query = { table: string; op: 'select' | 'delete'; filters: Filter[] }
type Result = { data: unknown; error: { message: string; code?: string } | null }
type Entry = { name: string; id: string | null }

const fake = vi.hoisted(() => {
  const s = {
    log: [] as string[],
    profile: null as Record<string, unknown> | null,
    profileError: false,
    owned: [] as { bucket: string; path: string }[],
    shops: [] as { id: string }[],
    takenShops: [] as { id: string }[],
    products: [] as { id: string }[],
    images: [] as { image_url: string }[],
    tree: {} as Record<string, Entry[]>,
    removeFails: false,
    identities: [{ provider: 'email' }] as { provider: string }[],
    metadata: { full_name: 'Réel Nom', city: 'Tunis' } as Record<string, unknown>,
    updates: [] as unknown[],
    removed: [] as string[],
  }
  return s
})

function handle(q: Query): Result {
  const has = (op: string, column: string) => q.filters.some((f) => f[0] === op && f[1] === column)
  fake.log.push(`${q.op}:${q.table}`)
  if (q.table === 'profiles') return fake.profileError ? { data: null, error: { message: 'down' } } : { data: fake.profile, error: null }
  if (q.table === 'uploaded_objects') return { data: q.op === 'select' ? fake.owned : null, error: null }
  if (q.table === 'shops') return { data: has('neq', 'owner_id') ? fake.takenShops : fake.shops, error: null }
  if (q.table === 'products') return { data: fake.products, error: null }
  if (q.table === 'product_images') return { data: q.op === 'select' ? fake.images : fake.images.map((_, i) => ({ id: `r${i}` })), error: null }
  return { data: null, error: { message: `unexpected ${q.table}` } }
}

class FakeQuery implements PromiseLike<Result> {
  q: Query
  constructor(table: string, op: 'select' | 'delete') {
    this.q = { table, op, filters: [] }
  }
  select() { return this }
  maybeSingle() { return this }
  eq(c: string, v: unknown) { this.q.filters.push(['eq', c, v]); return this }
  neq(c: string, v: unknown) { this.q.filters.push(['neq', c, v]); return this }
  in(c: string, v: unknown) { this.q.filters.push(['in', c, v]); return this }
  then<A, B>(ok?: ((r: Result) => A | PromiseLike<A>) | null, ko?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve(handle(this.q)).then(ok, ko)
  }
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => new FakeQuery(table, 'select'),
      delete: () => new FakeQuery(table, 'delete'),
    }),
    storage: {
      from: (bucket: string) => ({
        list: async (prefix: string) => {
          fake.log.push(`list:${bucket}/${prefix}`)
          return { data: fake.tree[`${bucket}/${prefix}`] ?? [], error: null }
        },
        remove: async (paths: string[]) => {
          fake.log.push(`remove:${bucket}`)
          if (fake.removeFails) return { data: null, error: { message: 'storage down' } }
          fake.removed.push(...paths.map((p) => `${bucket}/${p}`))
          return { data: paths.map((name) => ({ name })), error: null }
        },
      }),
    },
    auth: {
      admin: {
        getUserById: async () => {
          fake.log.push('auth:get')
          return { data: { user: { id: USER, user_metadata: fake.metadata, identities: fake.identities } }, error: null }
        },
        updateUserById: async (_id: string, attrs: unknown) => {
          fake.log.push('auth:update')
          fake.updates.push(attrs)
          return { data: { user: {} }, error: null }
        },
      },
    },
  }),
}))

import { finishAccountErasure } from '@/lib/admin/account-erasure'

const file = (name: string): Entry => ({ name, id: `id-${name}` })
const folder = (name: string): Entry => ({ name, id: null })

beforeEach(() => {
  Object.assign(fake, {
    log: [], profileError: false, owned: [], shops: [], takenShops: [], products: [], images: [], tree: {},
    removeFails: false, identities: [{ provider: 'email' }], metadata: { full_name: 'Réel Nom', city: 'Tunis' },
    updates: [], removed: [],
    profile: { full_name: 'Compte supprimé', email: TOMBSTONE, suspended_at: '2026-11-06T00:00:00Z' },
  })
})

describe('guard — fails closed', () => {
  it.each([
    ['another name', { full_name: 'Réel Nom' }],
    ['another e-mail', { email: 'real@example.com' }],
    ['not suspended', { suspended_at: null }],
  ])('a profile that is not a tombstone (%s) is refused, with no auth or storage call', async (_, patch) => {
    fake.profile = { ...fake.profile, ...patch }
    expect(await finishAccountErasure(USER)).toEqual({ ok: false, step: 'guard', reason: 'not_tombstoned' })
    expect(fake.log).toEqual(['select:profiles'])
  })

  it('a failed lookup or a missing profile runs nothing', async () => {
    fake.profileError = true
    expect(await finishAccountErasure(USER)).toEqual({ ok: false, step: 'guard', reason: 'failed' })
    fake.profileError = false
    fake.profile = null
    expect(await finishAccountErasure(USER)).toEqual({ ok: false, step: 'guard', reason: 'not_found' })
    expect(fake.log.filter((l) => l.startsWith('auth') || l.startsWith('list') || l.startsWith('remove'))).toEqual([])
  })
})

describe('erasure', () => {
  it('auth: tombstone e-mail, every metadata key nulled, 100-year ban', async () => {
    await finishAccountErasure(USER)
    expect(fake.updates).toEqual([{
      email: TOMBSTONE, email_confirm: true, ban_duration: '876000h', user_metadata: { full_name: null, city: null },
    }])
  })

  it('files: provenance + product images + folder sweep, removed BEFORE the provenance rows, then image rows', async () => {
    fake.owned = [{ bucket: 'avatars', path: `${USER}/a.webp` }]
    fake.shops = [{ id: SHOP }]
    fake.products = [{ id: 'p1' }]
    fake.images = [{ image_url: `https://x.supabase.co/storage/v1/object/public/product-images/${SHOP}/p1/i.webp` }]
    fake.tree[`avatars/${USER}`] = [file('a.webp'), file('orphan.webp')]
    fake.tree[`shop-assets/${SHOP}`] = [folder('logo')]
    fake.tree[`shop-assets/${SHOP}/logo`] = [file('l.webp')]

    expect(await finishAccountErasure(USER)).toEqual({ ok: true, filesRemoved: 4, imageRowsRemoved: 1 })
    expect(fake.removed.sort()).toEqual([
      `avatars/${USER}/a.webp`, `avatars/${USER}/orphan.webp`, `product-images/${SHOP}/p1/i.webp`, `shop-assets/${SHOP}/logo/l.webp`,
    ].sort())
    const lastRemove = fake.log.map((l) => l.startsWith('remove:')).lastIndexOf(true)
    const provenanceDelete = fake.log.indexOf('delete:uploaded_objects')
    expect(lastRemove).toBeGreaterThan(-1)
    expect(provenanceDelete).toBeGreaterThan(lastRemove)
    expect(fake.log.indexOf('delete:product_images')).toBeGreaterThan(provenanceDelete)
  })

  it('a failed Storage remove keeps the provenance rows (the retry still finds the files)', async () => {
    fake.owned = [{ bucket: 'avatars', path: `${USER}/a.webp` }]
    fake.removeFails = true
    expect(await finishAccountErasure(USER)).toEqual({ ok: false, step: 'files', reason: 'failed' })
    expect(fake.log).not.toContain('delete:uploaded_objects')
    expect(fake.log).not.toContain('delete:product_images')
  })

  it('a shop the RPC already deleted is still swept, from the person’s own provenance paths', async () => {
    fake.owned = [{ bucket: 'shop-assets', path: `${GONE_SHOP}/logo/l.webp` }]
    fake.tree[`shop-assets/${GONE_SHOP}`] = [folder('banner')]
    fake.tree[`shop-assets/${GONE_SHOP}/banner`] = [file('b.webp')]
    await finishAccountErasure(USER)
    expect(fake.removed).toContain(`shop-assets/${GONE_SHOP}/banner/b.webp`)
  })

  it('…but a shop that now belongs to someone else is never swept', async () => {
    fake.owned = [{ bucket: 'shop-assets', path: `${GONE_SHOP}/logo/l.webp` }]
    fake.takenShops = [{ id: GONE_SHOP }]
    fake.tree[`shop-assets/${GONE_SHOP}`] = [file('theirs.webp')]
    await finishAccountErasure(USER)
    expect(fake.log).not.toContain(`list:shop-assets/${GONE_SHOP}`)
    expect(fake.removed).not.toContain(`shop-assets/${GONE_SHOP}/theirs.webp`)
    expect(fake.removed).toContain(`shop-assets/${GONE_SHOP}/logo/l.webp`) // the person's own provenance row
  })

  it('a folder deeper than the sweep limit fails instead of reporting done', async () => {
    fake.tree[`avatars/${USER}`] = [folder('a')]
    fake.tree[`avatars/${USER}/a`] = [folder('b')]
    fake.tree[`avatars/${USER}/a/b`] = [folder('c')]
    fake.tree[`avatars/${USER}/a/b/c`] = [folder('d')]
    expect(await finishAccountErasure(USER)).toEqual({ ok: false, step: 'files', reason: 'failed' })
    expect(fake.log.some((l) => l.startsWith('remove'))).toBe(false)
  })

  it('an OAuth identity: files and rows are erased, but the run is « identity_left », never done', async () => {
    fake.identities = [{ provider: 'email' }, { provider: 'google' }]
    fake.owned = [{ bucket: 'avatars', path: `${USER}/a.webp` }]
    expect(await finishAccountErasure(USER)).toEqual({ ok: false, step: 'auth', reason: 'identity_left' })
    expect(fake.removed).toContain(`avatars/${USER}/a.webp`)
    expect(fake.log).toContain('delete:uploaded_objects')
  })
})
