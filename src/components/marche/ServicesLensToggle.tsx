import { Briefcase, Users } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

// The Services / Freelances lens toggle above the browse grid (Figma 611:45637 → view-toggle
// 661:53879): a surface-pill track (radius 10, pad 4) with two 36px segments (radius 8, pad-x 12).
// Services is the active white pill; the Freelances lens is a deliberate fast-follow (its data
// layer + cards + /freelance pages don't exist yet — Scope A), so it renders disabled and KEEPS
// its visible "Bientôt" badge: the badge and the disabled-option support are load-bearing while
// that lens is deferred, which is also why this stays a bespoke toggle rather than the shared
// SegmentedControl (which supports neither). Consolidating the two is a logged follow-up.
// Static markup — no client interaction — so this stays a server component.
export function ServicesLensToggle({ lang }: { lang: Lang }) {
  return (
    // self-start: the track is already inline-flex, but its parent in ServicesBrowsePage is a
    // flex-col, whose default align-items:stretch widened it to the full content row (Figma
    // 611:45644 hugs its segments — delta S5). inline-flex alone cannot win against stretch.
    <div
      aria-label={t('services.lens.ariaLabel', lang)}
      className="inline-flex items-center self-start rounded-[10px] bg-surface-pill p-1"
    >
      <span
        aria-current="page"
        className="inline-flex h-9 items-center gap-1 rounded-md bg-white px-3 text-body-sm font-medium text-text-primary shadow-sm"
      >
        <Briefcase className="h-4 w-4" aria-hidden="true" />
        {t('services.lens.services', lang)}
      </span>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title={t('services.lens.soon', lang)}
        className="inline-flex h-9 cursor-not-allowed items-center gap-1 rounded-md px-3 text-body-sm font-medium text-text-secondary"
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
