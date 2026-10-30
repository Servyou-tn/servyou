import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// The Services / Freelances lens toggle above the browse grid — Figma 662:53894 → view-toggle (and 663:55017 at 375): a surface-sunken track
// (radius 10, pad 4) with two 36 px segments (radius 8, pad-x 12, body-sm Medium, text only — the segment widths 82 / 98 are text + 24). The
// active segment is the white pill with shadow-xs and text-primary; the other is text-secondary on no fill. The twin of ProduitsLensToggle.
//
// BOTH LENSES ARE LIVE. Each segment is a plain link — the lens lives in the URL (`/marche/services` vs `/marche/services?vue=freelances`,
// the same `vue` parameter as the Boutiques lens), so it is shareable, back-button safe and needs no client state. Switching lens drops the
// other lens's filters on purpose: a price range means nothing to a freelancer, and the two result sets paginate separately.
//
// The earlier « Bientôt » badge, disabled segment and the Briefcase / Users glyphs are gone with the page they stood in for (decision D3).
// Static markup, no client interaction — stays a server component.
export type ServicesLens = 'services' | 'freelances'

const SEGMENT = `inline-flex h-9 items-center justify-center rounded-md px-3 text-body-sm font-medium transition-colors ${FOCUS_RING}`

export function ServicesLensToggle({ lang, active = 'services' }: { lang: Lang; active?: ServicesLens }) {
  return (
    // self-start: the track is inline-flex, but its parent in the browse pages is a flex-col, whose default align-items:stretch would widen it to
    // the full content row (Figma 611:45644 hugs its segments — delta S5). inline-flex alone cannot win against stretch.
    <nav aria-label={t('services.lens.ariaLabel', lang)} className="inline-flex items-center self-start rounded-[10px] bg-surface-sunken p-1">
      <Link
        href="/marche/services"
        aria-current={active === 'services' ? 'page' : undefined}
        className={`${SEGMENT} ${active === 'services' ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
      >
        {t('services.lens.services', lang)}
      </Link>
      <Link
        href="/marche/services?vue=freelances"
        aria-current={active === 'freelances' ? 'page' : undefined}
        className={`${SEGMENT} ${active === 'freelances' ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
      >
        {t('services.lens.freelances', lang)}
      </Link>
    </nav>
  )
}
