/**
 * The public contact form's server action (pre-beta review M5): every field is type-checked and length-capped,
 * every submit costs a Turnstile check (verified before anything else), and the log carries no personal data.
 * Turnstile is mocked; validateContactForm runs for real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const bot = vi.hoisted(() => ({ verify: vi.fn() }))
vi.mock('@/lib/security/turnstile', () => ({ verifyTurnstile: bot.verify }))

import { submitContactMessage } from '@/app/(marketing)/contact/actions'
import { NAME_MAX, EMAIL_MAX, SUBJECT_MAX, MESSAGE_MAX, validateContactForm } from '@/lib/contact/contact-validation'

const VALID = { name: 'Sami Trabelsi', email: 'sami@example.com', subject: 'contact.form.subject.general', message: 'Bonjour' }
const TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'
let logs: unknown[][] = []

beforeEach(() => {
  bot.verify.mockReset().mockResolvedValue({ ok: true })
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
        subject: 's'.repeat(SUBJECT_MAX),
        message: 'm'.repeat(MESSAGE_MAX),
      }).ok,
    ).toBe(true)
  })
})
