import { Briefcase, Users } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

// The Services / Freelances lens toggle above the browse grid (Figma 611:45637 → view-toggle
// 661:53879): a surface-pill track (r10, pad 4) with two 36px segments (r8, pad-x 12). Services
// is the active white pill; the Freelances lens is a deliberate fast-follow (its data layer +
// cards + /freelance pages don't exist yet — Scope A), so it renders disabled — no visible
// "Bientôt" badge (per the v3.7 frame), just a title tooltip for honesty. Static markup — no
// client interaction — so this stays a server component. When Freelances ships it becomes a
// real two-way nav.
export function ServicesLensToggle({ lang }: { lang: Lang }) {
  return (
    <div
      aria-label={t('services.lens.ariaLabel', lang)}
      className="inline-flex items-center rounded-[10px] bg-surface-pill p-1"
    >
      <span
        aria-current="page"
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-body-sm font-medium text-text-primary shadow-sm"
      >
        <Briefcase className="h-4 w-4" aria-hidden="true" />
        {t('services.lens.services', lang)}
      </span>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title={t('services.lens.soon', lang)}
        className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg px-3 text-body-sm font-medium text-text-secondary"
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        {t('services.lens.freelances', lang)}
      </button>
    </div>
  )
}
