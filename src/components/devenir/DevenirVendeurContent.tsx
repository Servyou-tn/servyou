'use client'

import Link from 'next/link'
import { ArrowRight, Store, Wallet, Package } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { BenefitGrid } from './BenefitGrid'
import { TermsLine } from './TermsLine'

// Rebuilt from the measured Figma frame (555:37032, "Devenir vendeur (boutique) — 1440"), per
// docs/design/devenir-boutique-discovery.md — the same treatment as the freelance sibling
// (f92d793), same two divergences from the frame, for the same reasons:
//
// 1. AGE GATE CUT. The frame draws a read-only DOB display (unlike freelance's input) below
//    the cards. /devenir-vendeur already runs the age check once, before either role card
//    renders (`isOldEnoughToSignup`, src/app/devenir-vendeur/page.tsx:39) — nobody reaches this
//    page without having passed. Redisplaying the DOB here just repeats what the previous
//    screen already showed.
//
// 2. CTA RELOCATED INTO THE HERO. The frame's only CTA button lived inside that now-cut
//    age-gate module — the hero itself, as measured, has no button. Both CTAs (primary +
//    the pre-existing secondary "voir des boutiques" browse link) moved up into the hero.
//
// TERMS LINE — the age-gate module also held a legal line ("En continuant, vous acceptez les
// conditions d'utilisation vendeur."). Restored via the shared `TermsLine` (also used by
// freelance, whose own line was dropped by mistake in the first rebuild), now pointing at the
// general /conditions page rather than a seller-specific document that doesn't exist — see
// TermsLine.tsx.
//
// CTA target: /ma-boutique/creer already exists (built in #127) — unlike freelance's still-404
// /mon-profil-freelance/creer, this one resolves live today.
//
// HowItWorks / FAQ / FinalCTA: the frame draws none of them, and this page was their last
// remaining caller (freelance dropped them in f92d793) — deleted from the codebase in this PR,
// not just cut from this render.
export function DevenirVendeurContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const lang = useLang()
  const createHref = isAuthenticated
    ? '/ma-boutique/creer'
    : '/inscription?next=' + encodeURIComponent('/ma-boutique/creer')
  const k = (s: string) => t(`devenir.vendeur.${s}`, lang)

  return (
    // Mirrors /devenir-vendeur/page.tsx's and DevenirFreelanceContent.tsx's wrapper verbatim —
    // this frame's column also measures exactly 720px.
    <div className="mx-auto max-w-[720px] px-4 py-10 sm:px-6 lg:px-0">
      <section className="text-center">
        <span className="mb-4 inline-block rounded-full bg-brand-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-blue-600">
          {k('hero.eyebrow')}
        </span>
        <h1 className="mb-4 text-4xl font-bold leading-tight text-text-primary md:text-5xl">
          {k('hero.headline')}
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-text-muted">
          {k('hero.subheadline')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={createHref}
            className={`inline-flex h-12 items-center gap-2 rounded-full bg-brand-blue-600 px-6 font-semibold text-white shadow-md transition-all duration-200 ease-out hover:bg-brand-blue-500 hover:shadow-lg ${FOCUS_RING}`}
          >
            {k('hero.primaryCta')}
            <ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
          <Link
            href="/marche?type=product"
            className={`inline-flex h-12 items-center rounded-full border border-border-subtle bg-white px-6 font-medium text-text-primary transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
          >
            {k('hero.secondaryCta')}
          </Link>
        </div>
        <TermsLine />
      </section>

      {/* 32px gap, measured (hero ends y=127, value-cards starts y=159 in the frame). */}
      <div className="mt-8">
        <BenefitGrid
          columns={3}
          benefits={[
            { icon: <Store className="h-6 w-6" aria-hidden="true" />, title: k('card1.title'), description: k('card1.desc') },
            { icon: <Wallet className="h-6 w-6" aria-hidden="true" />, title: k('card2.title'), description: k('card2.desc') },
            { icon: <Package className="h-6 w-6" aria-hidden="true" />, title: k('card3.title'), description: k('card3.desc') },
          ]}
        />
      </div>
    </div>
  )
}
