'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/ui/interactive-surface'

// "Publier un projet" — the primary call-to-action in the consumer top bar, linking to the
// post-a-mission form. Geometry h-11, px-4, text-sm font-medium with a permanent SOLID brand-accent
// fill + white text, reusing the established CTA token convention from the /mes-missions header
// button (bg-brand-accent → hover:bg-brand-accent-light brighten + a soft lift + FOCUS_RING).
//
// Shape is rounded-2xl — a deliberate rounded RECTANGLE, not the rounded-full pill the nav/sidebar
// buttons use. rounded-2xl is this codebase's house radius for rounded-rectangle surfaces (the
// avatar/help/language dropdown panels), so the CTA reads as a distinct rectangular action rather
// than another pill. (At md the label collapses, so the icon-only state is a rounded square.)
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
        'inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-brand-accent px-4 text-sm font-medium text-white',
        'transition-all duration-200 ease-out hover:bg-brand-accent-light hover:shadow-[0_4px_12px_rgba(37,99,235,0.30)] active:scale-[0.98] motion-reduce:active:scale-100',
        FOCUS_RING,
      )}
    >
      <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="md:hidden lg:inline">{t('marche.cta.publish_project', lang)}</span>
    </Link>
  )
}
