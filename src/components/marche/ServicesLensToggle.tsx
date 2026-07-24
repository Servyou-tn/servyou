import { Briefcase, Users } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

// The Services / Freelances lens toggle above the browse grid (Figma 611:45637). Services is
// the current surface; the Freelances lens is a deliberate fast-follow (its data layer +
// cards + /freelance pages don't exist yet — Scope A), so it renders disabled with a
// "bientôt" tag rather than linking anywhere. Static markup — no client interaction — so this
// stays a server component. When Freelances ships, this becomes a real two-way nav.
export function ServicesLensToggle({ lang }: { lang: Lang }) {
  return (
    <div
      aria-label={t('services.lens.ariaLabel', lang)}
      className="inline-flex items-center gap-1 rounded-lg bg-surface-pill p-1"
    >
      <span
        aria-current="page"
        className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-body-sm font-medium text-text-primary shadow-sm"
      >
        <Briefcase className="h-4 w-4" aria-hidden="true" />
        {t('services.lens.services', lang)}
      </span>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title={t('services.lens.soon', lang)}
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-1.5 text-body-sm font-medium text-text-muted"
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        {t('services.lens.freelances', lang)}
        <span className="rounded-full bg-brand-blue-100 px-1.5 py-0.5 text-caption font-semibold text-brand-blue-600">
          {t('services.lens.soon', lang)}
        </span>
      </button>
    </div>
  )
}
