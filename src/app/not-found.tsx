import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { MarketingShell } from '@/components/layout/MarketingShell'

const primaryBtn = (focus: string) =>
  `inline-flex h-12 items-center justify-center rounded-full bg-brand-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-primary ${focus}`
const secondaryBtn = (focus: string) =>
  `inline-flex h-12 items-center justify-center rounded-full border border-border-subtle bg-white px-6 text-sm font-semibold text-text-primary transition-colors hover:bg-slate-50 ${focus}`

export default async function NotFound() {
  const lang = await getLang()

  const usefulLinks = [
    { href: '/marche', key: 'marche.sidebar.marche' },
    { href: '/a-propos', key: 'nav.about' },
    { href: '/faq', key: 'landing.footer.faq' },
    { href: '/contact', key: 'landing.footer.contact' },
    { href: '/conditions', key: 'landing.footer.legal_terms' },
  ]

  return (
    <MarketingShell lang={lang}>
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-7xl font-bold text-brand-primary/20" aria-hidden="true">
          {t('system.notFound.code', lang)}
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-text-primary">
          {t('system.notFound.title', lang)}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-text-muted">
          {t('system.notFound.subtitle', lang)}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/" className={primaryBtn(FOCUS_RING)}>
            {t('system.notFound.home', lang)}
          </Link>
          <Link href="/marche" className={secondaryBtn(FOCUS_RING)}>
            {t('system.notFound.marche', lang)}
          </Link>
          <Link
            href="/contact"
            className={`rounded text-sm font-medium text-text-muted hover:underline ${FOCUS_RING}`}
          >
            {t('system.notFound.contact', lang)}
          </Link>
        </div>

        <div className="mt-12">
          <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
            {t('system.notFound.linksHeading', lang)}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {usefulLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`inline-flex items-center rounded-full border border-border-subtle bg-white px-4 py-2 text-body-sm font-medium text-text-primary transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
              >
                {t(l.key, lang)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MarketingShell>
  )
}
