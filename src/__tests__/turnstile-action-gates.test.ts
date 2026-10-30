/**
 * The Turnstile gate in the six protected server actions — submitProductRequest, submitServiceRequest, createDispute,
 * createListingReportAction, createShopReportAction, createFreelancerReportAction. With TURNSTILE_SECRET_KEY set,
 * a refused (or missing) token returns the bot-check message BEFORE the action creates a Supabase client, so no
 * database call happens; a verified token lets it through to the normal path. Without the secret the gate is
 * skipped (covered by the actions' own suites, which run with no Turnstile env). Supabase and siteverify are
 * mocked. Run by path.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const getUser = vi.fn(async () => ({ data: { user: null }, error: null }))
  const createClient = vi.fn(async () => ({ auth: { getUser }, from: vi.fn() }))
  return { createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/i18n/server', () => ({ getLang: vi.fn(async () => 'fr') }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }))

import { submitProductRequest, submitServiceRequest } from '@/app/demander/[id]/actions'
import { createListingReportAction } from '@/app/actions/listing-reports'
import { createShopReportAction } from '@/app/boutique/[id]/actions'
import { createFreelancerReportAction } from '@/app/freelance/[id]/actions'
import { createDispute } from '@/app/actions/disputes'
import { t } from '@/lib/i18n'

const BOT_CHECK = { ok: false, error: t('common.error_bot_check', 'fr') }
const TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'

const PRODUCT = {
  productId: '6f1c2a4e-3b5d-4c7e-9a1b-2d4f6a8c0e12',
  deliveryName: 'Ahmed Ben Ali',
  deliveryStreet: '12 Rue de la Liberté',
  quartier: 'Ennasr 2',
  ville: 'Ariana',
  governorate: 'Ariana',
  deliveryPhone: '20123456',
  quantity: 1,
  note: '',
}
const SERVICE = {
  serviceId: '7a2d3b5f-4c6e-4d8f-8b2c-3e5a7b9d1f23',
  description: 'Refonte du logo et de la charte graphique pour ma boutique.',
  timeframe: '',
  budget: '',
  phone: '20123456',
}
const ID = '11111111-1111-4111-8111-111111111111'

const ACTIONS: [string, (token?: string) => Promise<unknown>][] = [
  ['submitProductRequest', (token) => submitProductRequest(PRODUCT, token)],
  ['submitServiceRequest', (token) => submitServiceRequest(SERVICE, token)],
  ['createListingReportAction', (token) => createListingReportAction({ kind: 'service', targetId: ID, reason: 'other' }, token)],
  ['createShopReportAction', (token) => createShopReportAction({ shopId: ID, reason: 'other' }, token)],
  ['createFreelancerReportAction', (token) => createFreelancerReportAction({ freelancerProfileId: ID, reason: 'other' }, token)],
]

const fetchMock = vi.fn()

beforeEach(() => {
  h.createClient.mockClear()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe.each(ACTIONS)('%s — Turnstile gate', (_name, call) => {
  it('refuses a missing token before any database work', async () => {
    expect(await call(undefined)).toEqual(BOT_CHECK)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('refuses a token Cloudflare rejects before any database work', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] })))
    expect(await call(TOKEN)).toEqual(BOT_CHECK)
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('refuses when siteverify is unreachable (fail closed)', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    expect(await call(TOKEN)).toEqual(BOT_CHECK)
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('lets a verified token through to the normal path', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })))
    expect(await call(TOKEN)).not.toEqual(BOT_CHECK)
    expect(h.createClient).toHaveBeenCalledTimes(1)
  })
})

// createDispute (« Signaler un problème » on an order) answers with i18n KEYS, so its refusal is the key itself.
describe('createDispute — Turnstile gate', () => {
  const call = (token?: string) => createDispute(ID, 'not_delivered', 'Commande jamais reçue.', token)
  const REFUSED = { success: false, error: 'common.error_bot_check' }

  it('refuses a missing token before any database work', async () => {
    expect(await call(undefined)).toEqual(REFUSED)
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('refuses a token Cloudflare rejects, and an unreachable siteverify (fail closed)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false })))
    expect(await call(TOKEN)).toEqual(REFUSED)
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    expect(await call(TOKEN)).toEqual(REFUSED)
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('lets a verified token through to the normal path', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true })))
    expect(await call(TOKEN)).not.toEqual(REFUSED)
    expect(h.createClient).toHaveBeenCalledTimes(1)
  })
})
