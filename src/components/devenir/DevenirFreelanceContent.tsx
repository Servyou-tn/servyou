'use client'

import Link from 'next/link'
import { ArrowRight, Search, Wallet, TrendingUp } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { BenefitGrid } from './BenefitGrid'
import { TermsLine } from './TermsLine'

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
// TERMS LINE — the age-gate module also held a legal line ("En continuant, vous acceptez les
// conditions d'utilisation freelance."). The first rebuild (f92d793) dropped it silently along
// with the age-gate instead of relocating it with the CTA — an omission, not a recorded
// decision, caught during the boutique sibling's discovery pass. Restored here via the shared
// `TermsLine` (also used by boutique), now pointing at the general /conditions page rather than
// a role-specific document that doesn't exist — see TermsLine.tsx.
//
// CTA target: /mon-profil-freelance/creer now exists (H2 step 1, feat/h2-step1-bases,
// 2026-08-14) — this was the same position /ma-boutique/creer was in before G2 shipped, and it
// resolved the same way. The bare workspace root (`/mon-profil-freelance`, no `/creer`) is
// STILL unbuilt — src/lib/roles.ts:76 and ProfileAvatarMenu.tsx:104,133 reference that path, not
// this one, and remain "404 until built" until it lands (docs/design/h2-discovery.md §7).
//
// HowItWorks / FAQ / FinalCTA are gone from this page's render since f92d793 — as of this PR
// they're deleted from the codebase entirely (boutique, the last remaining caller, moved off
// them too).
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
        <TermsLine />
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
