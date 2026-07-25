'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { interactiveSurface } from '@/components/ui/interactive-surface'

// "Publier un projet" — the primary call-to-action in the consumer top bar, linking to the
// post-a-mission form. Built as a "loud sibling" of the sidebar nav buttons: it reuses the SAME
// interactiveSurface(true) helper the sidebar's active items use, so it inherits their structural
// DNA — rounded-full pill, brand-blue-600/40 border, soft shadow, focus ring, text-sm font-medium —
// but COMPACTED one size step to feel native to the navbar's tighter density: h-10 (vs the sidebar's
// h-11), px-3.5, gap-1.5, h-3.5 icon. The font stays text-sm (legibility, not shrunk with the box).
// Only the FILL differs from the sidebar's active tint: a permanent SOLID brand-blue-600 background
// with white text + icon, the loudest reading of "louder fill" so it still functions as a primary CTA.
//
// Why solid white-on-blue instead of the sidebar's tint: the literal v4 spec (brand-blue-600 text on a
// louder brand-blue-600 tint) fails WCAG AA — text-brand-blue-600 on bg-brand-blue-600/20 is ~3.9:1
// (~3.3:1 on a louder hover), under the 4.5:1 floor for normal text. The dark-blue-text + louder-
// (=darker)-fill mechanism lowers contrast by construction (the sidebar's active tint only clears AA
// because it sits on the near-white /10). White on solid brand-blue-600 (#2563EB) is 5.2:1 — the only
// path that is loud + accessible + a structural sibling. For the same reason the hover is a shadow
// LIFT only (no colour change): brightening toward brand-blue-500 would drop white text to
// ~3.7:1, so the fill stays put and only the elevation animates.
//
// Shape is rounded-full — the sidebar buttons are pills, so "inherit the sidebar shape" = pill. This
// reverts v3's rounded-2xl and echoes the removed Trouver des Produits/Services pills.
//
// The label collapses to icon-only at md, where the single top-bar row is tightest (so the search
// keeps width), and returns at lg+. On mobile the CTA sits on its own row, so it shows the full
// label there too — hence `md:hidden lg:inline` (visible <md and ≥lg, hidden only at md). The
// aria-label stays the full text at every size, so the icon-only state is still labelled.
export function PublishProjectCTA() {
  const lang = useLang()
  return (
    <Link
      href="/mes-missions/nouvelle"
      aria-label={t('marche.cta.publish_project_aria', lang)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium',
        interactiveSurface(true),
        // Override interactiveSurface's h-11 → h-10 (one step down for navbar density), and its
        // active TINT with a solid brand-blue-600 fill + white text/icon (the icon inherits
        // currentColor). Hover lifts via shadow only — no fill change, so contrast holds at 5.2:1.
        'h-10 bg-brand-blue-600 text-white hover:shadow-[0_4px_12px_rgba(37,99,235,0.30)] active:scale-[0.98] motion-reduce:active:scale-100',
      )}
    >
      <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="md:hidden lg:inline">{t('marche.cta.publish_project', lang)}</span>
    </Link>
  )
}
