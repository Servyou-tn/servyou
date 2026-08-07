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
// ENABLED. Founder-approved divergence, and the reason is a hard dependency rather than taste:
// every Shop Card CTA resolves to /boutique/{id}, and NO /boutique route exists anywhere under
// src/app — not a stub, no directory (verified: GET /boutique/<uuid> → 404). Shipping the lens
// would put a grid of shops in front of buyers where every click is a 404, which is strictly worse
// than a disabled segment. The frame, the Shop Card (578:42367) and the data are all ready; only
// the destination is missing, so this un-defers the moment D3 (540:32918) lands.
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
