'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { validateContactForm, MESSAGE_MAX, type ContactErrors } from '@/lib/contact/contact-validation'
import { submitContactMessage } from './actions'

const SUBJECTS = [
  'contact.form.subject.general',
  'contact.form.subject.technical',
  'contact.form.subject.suggestion',
  'contact.form.subject.abuse',
  'contact.form.subject.other',
] as const

const fieldClass = (invalid: boolean) =>
  `w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#6B6B6B] ${FOCUS_RING} ${
    invalid ? 'border-red-400' : 'border-border-subtle'
  }`

export function ContactForm() {
  const lang = useLang()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const { ok, errors: clientErrors } = validateContactForm({ name, email, message })
    setErrors(clientErrors)
    if (!ok) return

    setSubmitting(true)
    try {
      const result = await submitContactMessage({ name, email, subject, message })
      if (result.ok) {
        toast.success(t('contact.form.success', lang))
        setName('')
        setEmail('')
        setSubject('')
        setMessage('')
        setErrors({})
      } else if (result.field) {
        setErrors({ [result.field]: true })
      }
    } catch (err) {
      console.error('[ContactForm] submit error:', err)
      toast.error(t('contact.form.error.generic', lang))
    } finally {
      setSubmitting(false)
    }
  }

  const errorText = (key: string) => (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {t(key, lang)}
    </p>
  )

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Nom */}
      <div>
        <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-text-primary">
          {t('contact.form.name', lang)}
        </label>
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
          className={fieldClass(!!errors.name)}
        />
        {errors.name && errorText('contact.form.error.name')}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-text-primary">
          {t('contact.form.email', lang)}
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          className={fieldClass(!!errors.email)}
        />
        {errors.email && errorText('contact.form.error.email')}
      </div>

      {/* Sujet (optional) */}
      <div>
        <label htmlFor="contact-subject" className="mb-1.5 block text-sm font-medium text-text-primary">
          {t('contact.form.subject', lang)}
        </label>
        <select
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={fieldClass(false)}
        >
          <option value="">{t('contact.form.subject.placeholder', lang)}</option>
          {SUBJECTS.map((key) => (
            <option key={key} value={key}>
              {t(key, lang)}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-text-primary">
          {t('contact.form.message', lang)}
        </label>
        <textarea
          id="contact-message"
          rows={6}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={!!errors.message}
          className={fieldClass(!!errors.message)}
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.message ? errorText('contact.form.error.message') : <span />}
          <span className="text-xs text-[#6B6B6B]">
            {t('contact.form.counter', lang, { count: message.length })}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`inline-flex h-12 items-center justify-center rounded-full bg-brand-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary disabled:opacity-60 ${FOCUS_RING}`}
      >
        {submitting ? t('contact.form.submitting', lang) : t('contact.form.submit', lang)}
      </button>
    </form>
  )
}
