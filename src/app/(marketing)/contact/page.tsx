import type { Metadata } from 'next'
import { publicMetadata } from '@/lib/seo/metadata'
import { Mail, Globe } from 'lucide-react'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { ContactForm } from './ContactForm'
import { CopyableEmail } from './CopyableEmail'
import { HitArea } from '@/components/ui/interactive-surface'
import { SOCIAL_ACCOUNTS } from '@/lib/contact/social-accounts'

export async function generateMetadata(): Promise<Metadata> {
  return publicMetadata('meta.contact', 'seo.desc.contact', '/contact')
}

const cardClass = 'rounded-2xl border border-border-subtle bg-white p-6 text-center'
const iconWrap =
  'mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue-600/10 text-brand-blue-600'

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
      <div className="mt-12 grid gap-6 md:grid-cols-2">
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

        {/* Réseaux sociaux — ServYou's own accounts (lib/contact/social-accounts.ts: only the ones with a real address). */}
        <div className={cardClass}>
          <div className={iconWrap}>
            <Globe className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-bold text-text-primary">{t('contact.methods.social.label', lang)}</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-x-4">
            {SOCIAL_ACCOUNTS.map((account) => (
              <li key={account.platform}>
                <a
                  href={account.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('contact.methods.social.link_aria', lang, { platform: account.name })}
                  className="inline-block text-sm font-medium text-brand-blue-600 hover:underline max-lg:relative"
                >
                  {account.name}
                  <HitArea size={20} axis="y" />
                </a>
              </li>
            ))}
          </ul>
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
