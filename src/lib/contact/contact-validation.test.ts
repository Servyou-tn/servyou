import { describe, it, expect } from 'vitest'
import { validateContactForm, isValidEmail, MESSAGE_MAX } from './contact-validation'

describe('isValidEmail', () => {
  it('accepts a normal address and rejects malformed ones', () => {
    expect(isValidEmail('a@b.tn')).toBe(true)
    expect(isValidEmail('  user@servyou.tn ')).toBe(true)
    expect(isValidEmail('noatsign')).toBe(false)
    expect(isValidEmail('no@domain')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  // Audit H3: the old regex took ~10 s on this shape (many dots, then a character that fails the end anchor).
  const fake64k = 'a@' + 'a.'.repeat(31_998) + '@x'

  // Fastest of 3 calls, so one GC pause on a shared CI runner cannot fail the bound (the old code: ~10 s every call).
  const fastestMs = (fn: () => unknown) => {
    let best = Infinity
    for (let i = 0; i < 3; i++) {
      const start = performance.now()
      fn()
      best = Math.min(best, performance.now() - start)
    }
    return best
  }

  it('refuses a 64,000-character fake email in under 5 ms', () => {
    expect(fake64k).toHaveLength(64_000)
    expect(isValidEmail(fake64k)).toBe(false)
    expect(fastestMs(() => isValidEmail(fake64k))).toBeLessThan(5)
  })

  it('the server-side form check refuses it in under 5 ms too', () => {
    const fake = { name: 'Yasmine', email: fake64k, message: 'Bonjour' }
    const { ok, errors } = validateContactForm(fake)
    expect(ok).toBe(false)
    expect(errors).toEqual({ email: true })
    expect(fastestMs(() => validateContactForm(fake))).toBeLessThan(5)
  })
})

describe('validateContactForm', () => {
  const good = { name: 'Yasmine', email: 'y@servyou.tn', message: 'Bonjour' }

  it('passes a fully valid form', () => {
    expect(validateContactForm(good)).toEqual({ ok: true, errors: {} })
  })

  it('rejects an empty name', () => {
    const { ok, errors } = validateContactForm({ ...good, name: '   ' })
    expect(ok).toBe(false)
    expect(errors.name).toBe(true)
  })

  it('rejects an invalid email', () => {
    const { ok, errors } = validateContactForm({ ...good, email: 'nope' })
    expect(ok).toBe(false)
    expect(errors.email).toBe(true)
  })

  it('rejects an empty message and an over-long message', () => {
    expect(validateContactForm({ ...good, message: '' }).errors.message).toBe(true)
    expect(validateContactForm({ ...good, message: 'x'.repeat(MESSAGE_MAX + 1) }).errors.message).toBe(true)
  })

  it('flags every empty required field at once', () => {
    const { ok, errors } = validateContactForm({ name: '', email: '', message: '' })
    expect(ok).toBe(false)
    expect(errors).toEqual({ name: true, email: true, message: true })
  })
})
