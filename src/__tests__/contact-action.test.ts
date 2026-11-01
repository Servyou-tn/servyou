/**
 * The public contact form's server action (pre-beta review M5): every field is type-checked and length-capped,
 * every submit costs a Turnstile check (verified before anything else), the message is STORED (contact_messages,
 * service role) before success is answered — a failed store is an error, never a fake success — and the log carries
 * no personal data. Turnstile, the store and the session are mocked; validateContactForm runs for real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const bot = vi.hoisted(() => ({ verify: vi.fn() }))
vi.mock('@/lib/security/turnstile', () => ({ verifyTurnstile: bot.verify }))
const store = vi.hoisted(() => ({ save: vi.fn(), userId: null as string | null }))
vi.mock('@/lib/contact/save-message', () => ({ saveContactMessage: store.save }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: store.userId ? { id: store.userId } : null } }) } }),
}))

import { submitContactMessage } from '@/app/(marketing)/contact/actions'
import { NAME_MAX, EMAIL_MAX, SUBJECT_MAX, MESSAGE_MAX, validateContactForm } from '@/lib/contact/contact-validation'

const VALID = { name: 'Sami Trabelsi', email: 'sami@example.com', subject: 'contact.form.subject.general', message: 'Bonjour' }
const TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'
let logs: unknown[][] = []

beforeEach(() => {
  bot.verify.mockReset().mockResolvedValue({ ok: true })
  store.save.mockReset().mockResolvedValue({ ok: true })
  store.userId = null
  logs = []
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args)
  })
})

describe('submitContactMessage', () => {
  it('a valid message passes the bot check and logs no personal data', async () => {
    expect(await submitContactMessage(VALID, TOKEN)).toEqual({ ok: true })
    expect(bot.verify).toHaveBeenCalledWith(TOKEN)
    const logged = JSON.stringify(logs)
    expect(logged).not.toContain('Sami')
    expect(logged).not.toContain('sami@example.com')
    expect(logged).not.toContain('Bonjour')
    expect(logged).toContain('contact.form.subject.general')
  })

  it('the bot check runs before validation (an invalid payload with a failed check is « bot check »)', async () => {
    bot.verify.mockResolvedValue({ ok: false, reason: 'rejected' })
    expect(await submitContactMessage({ ...VALID, email: 'nope' }, 'bad')).toEqual({ ok: false, botCheck: true })
  })

  it("a subject outside the form's options is refused, so attacker text is never logged", async () => {
    expect(await submitContactMessage({ ...VALID, subject: 'x FAKE LOG LINE' }, TOKEN)).toEqual({ ok: false, field: 'subject' })
    expect(logs).toEqual([])
  })

  it('stores the trimmed message (anonymous sender: user_id null) before answering success', async () => {
    expect(await submitContactMessage({ ...VALID, name: '  Sami Trabelsi ', message: ' Bonjour \n' }, TOKEN)).toEqual({ ok: true })
    expect(store.save).toHaveBeenCalledWith({
      name: 'Sami Trabelsi',
      email: 'sami@example.com',
      subject: 'contact.form.subject.general',
      message: 'Bonjour',
      userId: null,
    })
  })

  it("a signed-in sender's account id is stored with the message", async () => {
    store.userId = 'u-42'
    await submitContactMessage(VALID, TOKEN)
    expect(store.save).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-42' }))
  })

  it('a failed store is an error (saveFailed), never a fake success, and nothing is logged as received', async () => {
    store.save.mockResolvedValue({ ok: false })
    expect(await submitContactMessage(VALID, TOKEN)).toEqual({ ok: false, saveFailed: true })
    expect(logs).toEqual([])
  })

  it('nothing is stored when the bot check or a length check fails', async () => {
    bot.verify.mockResolvedValue({ ok: false, reason: 'rejected' })
    await submitContactMessage(VALID, 'bad')
    bot.verify.mockResolvedValue({ ok: true })
    await submitContactMessage({ ...VALID, message: 'm'.repeat(MESSAGE_MAX + 1) }, TOKEN)
    expect(store.save).not.toHaveBeenCalled()
  })

  it('a failed bot check is refused before anything is logged', async () => {
    bot.verify.mockResolvedValue({ ok: false, reason: 'rejected' })
    expect(await submitContactMessage(VALID, 'bad')).toEqual({ ok: false, botCheck: true })
    expect(logs).toEqual([])
  })

  it.each([
    ['name', { name: 'x'.repeat(NAME_MAX + 1) }],
    ['email', { email: `${'a'.repeat(EMAIL_MAX)}@example.com` }],
    ['subject', { subject: 's'.repeat(SUBJECT_MAX + 1) }],
    ['message', { message: 'm'.repeat(MESSAGE_MAX + 1) }],
  ])('an over-long %s is refused on that field', async (field, patch) => {
    expect(await submitContactMessage({ ...VALID, ...patch }, TOKEN)).toEqual({ ok: false, field })
    expect(logs).toEqual([])
  })

  it.each([
    ['a non-object', null],
    ['a non-string name', { ...VALID, name: 42 }],
    ['a non-string subject', { ...VALID, subject: ['x'] }],
  ])('%s is refused before the bot check', async (_label, input) => {
    expect(await submitContactMessage(input as never, TOKEN)).toEqual({ ok: false, field: 'message' })
    expect(bot.verify).not.toHaveBeenCalled()
  })
})

describe('validateContactForm — a limit on every field', () => {
  it('the limits are inclusive', () => {
    expect(
      validateContactForm({
        name: 'n'.repeat(NAME_MAX),
        email: `${'a'.repeat(EMAIL_MAX - 12)}@example.com`,
        subject: 'contact.form.subject.other',
        message: 'm'.repeat(MESSAGE_MAX),
      }).ok,
    ).toBe(true)
  })
})
