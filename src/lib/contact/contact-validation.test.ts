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
