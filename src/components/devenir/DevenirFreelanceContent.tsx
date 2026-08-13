'use client'

import Link from 'next/link'
import { ArrowRight, Search, Wallet, TrendingUp } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { BenefitGrid } from './BenefitGrid'

// Rebuilt from the measured Figma frame (466:19958, "Devenir freelance — 1440"), per
// docs/design/devenir-freelance-discovery.md. The page is now exactly two regions: hero, then
// 3 value-cards — the frame draws nothing else. Two deliberate divergences from the frame,
// both recorded in the discovery doc so the frame isn't read as canonical later:
//
// 1. AGE GATE CUT. The frame draws a DOB *input* module below the cards. /devenir-vendeur
//    already runs the age check once, before either role card renders (`isOldEnoughToSignup`,
//    src/app/devenir-vendeur/page.tsx:39) — nobody reaches this page without having passed.
//    Re-asking here would re-collect data the platform already holds and already validated.
//
// 2. CTA RELOCATED INTO THE HERO. The frame's only CTA button lived inside that now-cut
//    age-gate module — the hero itself, as measured, is eyebrow + H1 + subline with no button
//    at all. Since the create-profile action still needs to live somewhere, both CTAs (primary
//    + the pre-existing secondary "voir des freelances" browse link) moved up into the hero.
//    Not measured; carried forward from the page's own pre-rebuild content.
//
// CTA target: /mon-profil-freelance/creer does not exist yet (H2 is a later build — the same
// position /ma-boutique/creer was in before G2 shipped). Wired anyway, not disabled: the
// canonical freelancer-workspace root (`/mon-profil-freelance`, no `/creer`) is already
// referenced elsewhere (src/lib/roles.ts:76, ProfileAvatarMenu.tsx:104,133) with the identical
// "404 until built" posture, and the `/creer` suffix matches the shop side's own
// `/ma-boutique` + `/ma-boutique/creer` shape.
//
// HowItWorks / FAQ / FinalCTA are cut from this page (no frame region for them) but their
// component files stay — DevenirVendeurContent.tsx (boutique) is still their only remaining
// caller. Deleting them is a boutique-rebuild cleanup, not this PR's.
export function DevenirFreelanceContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const lang = useLang()
  const createHref = isAuthenticated
    ? '/mon-profil-freelance/creer'
    : '/inscription?next=' + encodeURIComponent('/mon-profil-freelance/creer')
  const k = (s: string) => t(`devenir.freelance.${s}`, lang)

  return (
    // Mirrors /devenir-vendeur/page.tsx's own wrapper verbatim (mx-auto max-w-[720px] ...) —
    // the frame's own column is measured at exactly 720px, the same width as the parent page's
    // already-shipped, already-overflow-tested wrapper, so reusing it isn't a new value.
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
            href="/marche?type=service"
            className={`inline-flex h-12 items-center rounded-full border border-border-subtle bg-white px-6 font-medium text-text-primary transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
          >
            {k('hero.secondaryCta')}
          </Link>
        </div>
      </section>

      {/* 32px gap, measured (hero ends y=127, value-cards starts y=159 in the frame). */}
      <div className="mt-8">
        <BenefitGrid
          columns={3}
          benefits={[
            { icon: <Search className="h-6 w-6" aria-hidden="true" />, title: k('card1.title'), description: k('card1.desc') },
            { icon: <Wallet className="h-6 w-6" aria-hidden="true" />, title: k('card2.title'), description: k('card2.desc') },
            { icon: <TrendingUp className="h-6 w-6" aria-hidden="true" />, title: k('card3.title'), description: k('card3.desc') },
          ]}
        />
      </div>
    </div>
  )
}
