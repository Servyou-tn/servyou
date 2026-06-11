import Image from 'next/image'
import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ArrowRightIcon } from './icons'

// Section 8 — the emotional closing CTA (white block) followed by the navy
// footer that closes the page. Kept in one module because they're a single
// visual unit. Footer link targets are the real routes/anchors that exist today;
// pages not yet built (Contact, the four legal docs) point to "#" — honest over
// broken, per the template.

// Footer column 2 — Découvrir. Reuses existing nav/home labels.
const discoverLinks = [
  { key: 'nav.shops', href: '/#boutiques' },
  { key: 'nav.freelancers', href: '/#freelances' },
  { key: 'nav.missions_board', href: '/missions' },
  { key: 'home.categories', href: '/recherche' },
] as const

// Footer column 3 — Servyou.
const servyouLinks = [
  { key: 'nav.about', href: '/#a-propos' },
  { key: 'landing.footer.contact', href: '#' },
  { key: 'landing.footer.faq', href: '/#faq' },
] as const

// Footer column 4 — Légal. Pages pending lawyer review (Phase 10) → "#".
const legalLinks = [
  { key: 'landing.footer.legal_terms', href: '#' },
  { key: 'landing.footer.legal_privacy', href: '#' },
  { key: 'landing.footer.legal_cookies', href: '#' },
  { key: 'landing.footer.legal_accessibility', href: '#' },
] as const

function FooterColumn({ titleKey, links, lang }: { titleKey: string; links: readonly { key: string; href: string }[]; lang: Lang }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-white">{t(titleKey, lang)}</h3>
      <ul className="mt-4 space-y-3">
        {links.map(l => (
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

export function FinalCtaFooter({ lang }: { lang: Lang }) {
  return (
    <>
      {/* Closing CTA — white block, centered, emotional anchor line. */}
      <section className="bg-surface-base">
        <div className="mx-auto max-w-3xl px-6 py-28 text-center">
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-text-primary">
            {t('landing.final.heading', lang)}
          </h2>
          <div className="mt-10 flex justify-center">
            <Link
              href="/signup"
              className={`inline-flex h-14 items-center gap-2 rounded-full bg-brand-accent px-8 text-base font-semibold text-white transition-all hover:scale-[1.02] hover:bg-brand-primary ${FOCUS_RING}`}
            >
              {t('landing.hero.cta_primary', lang)}
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer — navy, closes the page. Carries the #a-propos anchor. */}
      <footer id="a-propos" className="scroll-mt-28 bg-brand-primary text-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            {/* Brand */}
            <div>
              {/* The logo art is dark-on-light, so it sits on a white chip to stay
                  legible on the navy footer. */}
              <span className="inline-flex rounded-xl bg-white px-3 py-2">
                <Image src="/brand/logo/servyou-navbar.png" alt="Servyou" width={1536} height={1024} className="h-9 w-auto" />
              </span>
              <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-slate-300">
                {t('landing.hero.headline', lang)}
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
    </>
  )
}
