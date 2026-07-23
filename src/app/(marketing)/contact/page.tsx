import type { Metadata } from 'next'
import { Mail, MessageCircle, Globe } from 'lucide-react'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { ContactForm } from './ContactForm'
import { CopyableEmail } from './CopyableEmail'

export const metadata: Metadata = { title: 'Contact — Servyou' }

const cardClass = 'rounded-2xl border border-border-subtle bg-white p-6 text-center'
const iconWrap =
  'mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent'

export default async function ContactPage() {
  const lang = await getLang()

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      {/* Headline */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
          {t('contact.headline', lang)}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-text-muted">{t('contact.subtitle', lang)}</p>
      </div>

      {/* Contact methods */}
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {/* Email */}
        <div className={cardClass}>
          <div className={iconWrap}>
            <Mail className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-bold text-text-primary">{t('contact.methods.email.label', lang)}</p>
          <div className="mt-2 flex justify-center">
            <CopyableEmail email="bonjour@servyou.tn" />
          </div>
          <p className="mt-2 text-xs text-text-muted">{t('contact.methods.email.response', lang)}</p>
        </div>

        {/* WhatsApp — TODO: Moatez to confirm public WhatsApp number (value + wa.me digits). */}
        <div className={cardClass}>
          <div className={iconWrap}>
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-bold text-text-primary">{t('contact.methods.whatsapp.label', lang)}</p>
          <a
            href="https://wa.me/216XXXXXXXX"
            className="mt-2 inline-block text-sm font-medium text-brand-accent hover:underline"
          >
            {t('contact.methods.whatsapp.value', lang)}
          </a>
        </div>

        {/* Réseaux sociaux — no live Servyou accounts yet → "Bientôt disponible". */}
        <div className={cardClass}>
          <div className={iconWrap}>
            <Globe className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-bold text-text-primary">{t('contact.methods.social.label', lang)}</p>
          <p className="mt-2 text-sm text-text-muted">{t('contact.methods.social.soon', lang)}</p>
        </div>
      </div>

      {/* Form */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-text-primary">{t('contact.form.heading', lang)}</h2>
        <div className="mt-6">
          <ContactForm />
        </div>
      </section>
    </div>
  )
}
