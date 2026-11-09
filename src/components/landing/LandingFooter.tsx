'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { Lockup } from './ui'
import { useLangSwitch } from './useLangSwitch'

// Footer — Figma 1729:51925 / 1729:51976. Rounded box (hero-box shape), surface-sunken → border-subtle
// gradient (a step darker than the FAQ box), brand column + 3 link columns, divider, bottom bar with the
// FR | العربية switch. The social logos are shown but not linked yet: the real ServYou account URLs are
// still to be provided (logged as a follow-up).
const COLUMNS = [
  {
    key: 'lp.footer.col.platform',
    links: [
      { href: '#categories', key: 'lp.nav.categories' },
      { href: '#freelances', key: 'lp.nav.freelances' },
      { href: '#boutiques', key: 'lp.nav.shops' },
      { href: '#comment-ca-marche', key: 'lp.nav.how' },
      { href: '#notre-mission', key: 'lp.nav.mission' },
    ],
  },
  {
    key: 'lp.footer.col.you',
    links: [
      { href: '/devenir-freelance', key: 'lp.free.cta' },
      { href: '/devenir-vendeur', key: 'lp.shop.cta' },
      { href: '/mes-annonces/nouvelle', key: 'lp.footer.publish' },
      { href: '/connexion', key: 'lp.footer.login' },
    ],
  },
  {
    key: 'lp.footer.col.help',
    links: [
      { href: '#faq', key: 'lp.footer.faq' },
      { href: '/contact', key: 'lp.footer.contact' },
      { href: '/conditions', key: 'lp.footer.terms' },
      { href: '/confidentialite', key: 'lp.footer.privacy' },
    ],
  },
]
const SOCIAL = ['facebook', 'instagram', 'whatsapp'] as const
const LINK = 'rounded-sm text-sm leading-[21px] text-text-secondary hover:text-text-primary'

export function LandingFooter() {
  const { lang, pending, switchTo } = useLangSwitch()

  const column = (c: (typeof COLUMNS)[number], className?: string) => (
    <div key={c.key} className={cn('flex flex-col gap-3', className)}>
      <h3 className="text-xs leading-[17px] font-semibold uppercase tracking-[0.08em] text-text-primary rtl:tracking-normal">{t(c.key, lang)}</h3>
      <ul className="flex flex-col gap-3">
        {c.links.map(l => (
          <li key={l.href}>
            <Link href={l.href} className={cn(LINK, FOCUS_RING)}>
              {t(l.key, lang)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <footer className="mx-2 mt-4 mb-2 flex flex-col gap-8 rounded-3xl border border-border-subtle bg-gradient-to-b from-surface-sunken to-border-subtle px-5 pt-10 pb-6 lg:mx-6 lg:mt-8 lg:mb-6 lg:gap-12 lg:rounded-[32px] lg:px-24 lg:pt-[72px] lg:pb-8 max-xl:lg:px-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:justify-between lg:gap-16">
        <div className="flex max-w-[300px] flex-col gap-4">
          <Link href="/" aria-label="ServYou" className={cn('self-start rounded-md', FOCUS_RING)}>
            <Lockup size={35} className="lg:hidden" />
            <Lockup size={40} className="max-lg:hidden" />
          </Link>
          <p className="text-sm leading-[21px] text-text-secondary">{t('lp.footer.tagline', lang)}</p>
          <a href="mailto:contact@servyou.tn" className={cn('inline-flex items-center gap-2 self-start rounded-sm text-sm leading-[21px] font-semibold text-brand-blue-700 hover:underline', FOCUS_RING)}>
            <Mail className="size-4" aria-hidden="true" />
            contact@servyou.tn
          </a>
          <ul className="flex gap-2.5" aria-label="Facebook, Instagram, WhatsApp">
            {SOCIAL.map(s => (
              <li key={s} className="flex size-9 items-center justify-center rounded-full border border-border-subtle bg-surface-base">
                <Image src={`/brand/landing/${s}.webp`} alt={s} width={22} height={22} className="size-[22px]" />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-7 lg:flex-row lg:gap-[72px]">
          <div className="flex gap-4 lg:contents">
            {column(COLUMNS[0], 'w-[150px] lg:w-auto')}
            {column(COLUMNS[1], 'w-[150px] lg:w-auto')}
          </div>
          {column(COLUMNS[2])}
        </div>
      </div>

      <hr className="border-border-strong" />

      <div className="flex flex-col items-center gap-3 lg:flex-row lg:justify-between lg:gap-4">
        <p className="text-xs leading-[17px] text-text-muted">{t('lp.footer.copyright', lang)}</p>
        <div className="flex items-center gap-4">
          <p className="text-xs leading-[17px] text-text-muted">{t('lp.footer.made', lang)}</p>
          <div
            role="group"
            aria-label={t('nav.switch_language', lang)}
            aria-busy={pending}
            className="flex gap-0.5 rounded-full border border-border-subtle bg-surface-base p-1"
          >
            {(
              [
                ['fr', 'FR'],
                ['ar', 'العربية'],
              ] as const
            ).map(([code, label]) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => switchTo(code)}
                className={cn(
                  'relative rounded-full px-2.5 py-[3px] text-xs leading-[17px] font-semibold',
                  lang === code ? 'bg-brand-blue-600 text-text-inverse' : 'text-text-secondary hover:text-text-primary',
                  FOCUS_RING,
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
