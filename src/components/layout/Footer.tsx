import Image from 'next/image'
import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { LanguageToggle } from '@/components/layout/LanguageToggle'

// The navy site footer — shared by the landing page (via FinalCtaFooter) and every
// (marketing) content page (via MarketingShell). Link targets are the real routes/
// anchors that exist today; pages still pending (the four legal docs) point to "#" —
// honest over broken. /a-propos, /contact, /faq are now real routes.

const discoverLinks = [
  { key: 'nav.shops', href: '/#boutiques' },
  { key: 'nav.freelancers', href: '/#freelances' },
  { key: 'nav.missions_board', href: '/missions' },
  { key: 'home.categories', href: '/recherche' },
] as const

const servyouLinks = [
  { key: 'nav.about', href: '/a-propos' },
  { key: 'landing.footer.contact', href: '/contact' },
  { key: 'landing.footer.faq', href: '/faq' },
] as const

// Légal — draft pages live (pending lawyer review); each carries a prominent draft banner.
const legalLinks = [
  { key: 'landing.footer.legal_terms', href: '/conditions' },
  { key: 'landing.footer.legal_privacy', href: '/confidentialite' },
  { key: 'landing.footer.legal_cookies', href: '/cookies' },
  { key: 'landing.footer.legal_accessibility', href: '/accessibilite' },
] as const

function FooterColumn({
  titleKey,
  links,
  lang,
}: {
  titleKey: string
  links: readonly { key: string; href: string }[]
  lang: Lang
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{t(titleKey, lang)}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.key}>
            <Link
              href={l.href}
              className={`rounded text-sm text-slate-300 transition-colors hover:text-white ${FOCUS_RING}`}
            >
              {t(l.key, lang)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Footer({ lang }: { lang: Lang }) {
  return (
    <footer id="a-propos" className="scroll-mt-28 bg-brand-blue-800 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            {/* The logo art is dark-on-light, so it sits on a white chip to stay
                legible on the navy footer. */}
            <span className="inline-flex rounded-xl bg-white px-3 py-2">
              <Image
                src="/brand/logo/servyou-navbar.png"
                alt="Servyou"
                width={1536}
                height={1024}
                className="h-9 w-auto"
              />
            </span>
            <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-slate-300">
              {t('landing.footer.tagline', lang)}
            </p>
            <p className="mt-3 text-sm text-slate-400">{t('landing.footer.founder_credit', lang)}</p>
          </div>

          <FooterColumn titleKey="landing.footer.col_discover" links={discoverLinks} lang={lang} />
          <FooterColumn titleKey="landing.footer.col_servyou" links={servyouLinks} lang={lang} />
          <FooterColumn titleKey="landing.footer.col_legal" links={legalLinks} lang={lang} />
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-sm text-slate-400">{t('landing.footer.copyright', lang)}</p>
          <LanguageToggle />
        </div>
      </div>
    </footer>
  )
}
