import { t, type Lang } from '@/lib/i18n'

// The Produits / Boutiques lens toggle above the browse grid — Figma 569:39769 → view-toggle
// 578:42513: a surface-sunken track (radius 10, pad 4) with two 36px segments (radius 8, pad-x 12,
// body-sm medium). Active is the white pill with shadow-xs and text-primary; inactive is
// text-secondary on no fill.
//
// ⚑ NO ICONS, DELIBERATELY. The services twin (ServicesLensToggle) carries Briefcase/Users glyphs;
// 578:42513 draws text only. That is a measured difference between the two frames, not drift.
//
// ⚑ THE "Bientôt" BADGE AND THE DISABLED STATE ARE INVENTED — 578:42513 DRAWS BOTH SEGMENTS
// ENABLED. Founder-approved divergence. STAYS DISABLED even after D3 shipped (2026-08-12,
// /boutique/[id]) — founder ruling: D3 only builds the single-shop detail page. This toggle
// gates an entire shop-GRID render path (a "vue Boutiques" for /marche/produits) that does not
// exist in code at all — `ShopCard` (578:42367) exists only in Figma, zero matches anywhere
// under src/. Re-enabling this is a separate build: a new ShopCard component, a new query, and
// wiring the toggle to real content — not something that falls out of D3 for free.
// Full reasoning: docs/follow-ups.md → "Boutiques lens — DEFERRED with a Bientôt badge".
//
// Static markup, no client interaction — stays a server component.
export function ProduitsLensToggle({ lang }: { lang: Lang }) {
  return (
    // self-start: the track is inline-flex, but its parent is a flex-col whose default
    // align-items:stretch would widen it to the full content row. inline-flex alone cannot win
    // against stretch — the same trap ServicesLensToggle documents.
    <div
      aria-label={t('produits.lens.ariaLabel', lang)}
      className="inline-flex items-center self-start rounded-[10px] bg-surface-sunken p-1"
    >
      <span
        aria-current="page"
        className="inline-flex h-9 items-center justify-center rounded-md bg-white px-3 text-body-sm font-medium text-text-primary shadow-xs"
      >
        {t('produits.lens.produits', lang)}
      </span>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title={t('produits.lens.soon', lang)}
        className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-md px-3 text-body-sm font-medium text-text-secondary"
      >
        {t('produits.lens.boutiques', lang)}
        <span className="rounded-full bg-brand-blue-100 px-1.5 py-0.5 text-caption font-semibold text-brand-blue-600">
          {t('produits.lens.soon', lang)}
        </span>
      </button>
    </div>
  )
}
