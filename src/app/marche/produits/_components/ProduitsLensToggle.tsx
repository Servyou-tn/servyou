import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// The Produits / Boutiques lens toggle above the browse grid — Figma 569:39769 → view-toggle
// 578:42513 (and 578:42528, the Boutiques specimen): a surface-sunken track (radius 10, pad 4) with
// two 36px segments (radius 8, pad-x 12, body-sm medium). Active is the white pill with shadow-xs and
// text-primary; inactive is text-secondary on no fill.
//
// BOTH LENSES ARE LIVE (B4). Each segment is a plain link — the lens lives in the URL
// (`/marche/produits` vs `/marche/produits?vue=boutiques`), so it is shareable, back-button safe and
// needs no client state. Switching lens deliberately drops the other lens's filters: a products
// category slug means nothing to shops, and the two result sets have different pagination.
//
// The earlier « Bientôt » badge and disabled segment (founder-approved while the shop grid did not
// exist) are gone with the grid.
//
// ⚑ NO ICONS, DELIBERATELY. The services twin (ServicesLensToggle) carries Briefcase/Users glyphs;
// 578:42513 draws text only. That is a measured difference between the two frames, not drift.
//
// Static markup, no client interaction — stays a server component.
export type ProduitsLens = 'produits' | 'boutiques'

const SEGMENT = `inline-flex h-9 items-center justify-center rounded-md px-3 text-body-sm font-medium transition-colors ${FOCUS_RING}`

export function ProduitsLensToggle({ lang, active = 'produits' }: { lang: Lang; active?: ProduitsLens }) {
  return (
    // self-start: the track is inline-flex, but its parent is a flex-col whose default
    // align-items:stretch would widen it to the full content row. inline-flex alone cannot win
    // against stretch — the same trap ServicesLensToggle documents.
    <nav
      aria-label={t('produits.lens.ariaLabel', lang)}
      className="inline-flex items-center self-start rounded-[10px] bg-surface-sunken p-1"
    >
      <Link
        href="/marche/produits"
        aria-current={active === 'produits' ? 'page' : undefined}
        className={`${SEGMENT} ${active === 'produits' ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
      >
        {t('produits.lens.produits', lang)}
      </Link>
      <Link
        href="/marche/produits?vue=boutiques"
        aria-current={active === 'boutiques' ? 'page' : undefined}
        className={`${SEGMENT} ${active === 'boutiques' ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
      >
        {t('produits.lens.boutiques', lang)}
      </Link>
    </nav>
  )
}
