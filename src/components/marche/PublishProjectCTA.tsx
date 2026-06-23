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
// DNA exactly — rounded-full pill, h-11, brand-accent/40 border, soft shadow, focus ring — plus the
// shared NAV layout tokens (px-4, gap-2, text-sm font-medium, h-4 icon). Only the FILL differs: a
// permanent SOLID brand-accent background with white text + icon, the loudest reading of v4's
// "slightly louder fill" so it still functions as a primary CTA.
//
// Why solid white-on-blue instead of the sidebar's tint: the literal v4 spec (brand-accent text on a
// louder brand-accent tint) fails WCAG AA — text-brand-accent on bg-brand-accent/20 is ~3.9:1
// (~3.3:1 on a louder hover), under the 4.5:1 floor for normal text. The dark-blue-text + louder-
// (=darker)-fill mechanism lowers contrast by construction (the sidebar's active tint only clears AA
// because it sits on the near-white /10). White on solid brand-accent (#2563EB) is 5.2:1 — the only
// path that is loud + accessible + a structural sibling. For the same reason the hover is a shadow
// LIFT only (no colour change): brightening toward brand-accent-light would drop white text to
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
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium',
        interactiveSurface(true),
        // Override the active TINT with a solid brand-accent fill + white text/icon (the icon
        // inherits currentColor). Hover lifts via shadow only — no fill change, so contrast holds.
        'bg-brand-accent text-white hover:shadow-[0_4px_12px_rgba(37,99,235,0.30)] active:scale-[0.98] motion-reduce:active:scale-100',
      )}
    >
      <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="md:hidden lg:inline">{t('marche.cta.publish_project', lang)}</span>
    </Link>
  )
}
