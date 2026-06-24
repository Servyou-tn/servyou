'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import type { JobPostRow } from '@/lib/freelance/job-board-data'

// One open project post on the board. The WHOLE card is the navigating Link (→ /emplois/{id},
// which 404s until the detail page ships); the "Voir →" affordance is a decorative aria-hidden
// span — never a nested <a> — mirroring how ServiceListingCard treats its arrow. No save/bookmark
// control (saved_missions doesn't exist yet) and no response count (job_responses isn't readable
// by a browsing visitor under RLS — deferred to a later PR). Same white-card DNA as the consumer
// listing cards, locked tokens only.

const MAX_SKILL_CHIPS = 3

// "100 – 200 TND" / "À partir de 100 TND" / "Jusqu'à 200 TND" / "Budget à discuter".
function budgetLabel(
  min: number | null,
  max: number | null,
  lang: 'fr' | 'ar',
): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
  if (min != null && max != null) return t('emplois.card.budget_range', lang, { min: fmt(min), max: fmt(max) })
  if (max != null) return t('emplois.card.budget_upto', lang, { amount: fmt(max) })
  if (min != null) return t('emplois.card.budget_from', lang, { amount: fmt(min) })
  return t('emplois.card.budget_tbd', lang)
}

// Compact relative age: "Aujourd'hui" or "Il y a {n} j". Open posts are recent, so days is enough.
function postedLabel(createdAt: string, lang: 'fr' | 'ar'): string {
  const days = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000))
  if (days <= 0) return t('emplois.card.posted_today', lang)
  return t('emplois.card.posted_days', lang, { n: days })
}

// "Tunis · À distance" / "À distance" / "Tunis" / "" — the location/remote line.
function locationLabel(city: string | null, isRemote: boolean, lang: 'fr' | 'ar'): string {
  const remote = t('emplois.card.remote', lang)
  if (city && isRemote) return `${city} · ${remote}`
  if (isRemote) return remote
  return city ?? ''
}

const chip = 'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700'

export function JobPostCard({ job }: { job: JobPostRow }) {
  const lang = useLang()
  const budget = budgetLabel(job.budgetMin, job.budgetMax, lang)
  const location = locationLabel(job.city, job.isRemote, lang)
  const visibleSkills = job.skills.slice(0, MAX_SKILL_CHIPS)
  const extraSkills = job.skills.length - visibleSkills.length

  return (
    <Link
      href={`/emplois/${job.id}`}
      aria-label={`${job.title} — ${budget}`}
      className={`block rounded-2xl border border-border-subtle bg-white p-4 transition-shadow hover:shadow-md sm:p-6 ${FOCUS_RING}`}
    >
      {/* Top row — category · posted date (left) and budget (right). */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {job.categoryName && <span className={chip}>{job.categoryName}</span>}
          <span className="text-xs text-text-muted">{postedLabel(job.createdAt, lang)}</span>
        </div>
        <span className="shrink-0 text-base font-semibold text-brand-accent">{budget}</span>
      </div>

      {/* Title + description preview. */}
      <h3 className="mt-3 line-clamp-1 text-base font-semibold text-text-primary">{job.title}</h3>
      {job.descriptionPreview && (
        <p className="mt-1 line-clamp-2 text-sm text-text-muted">{job.descriptionPreview}</p>
      )}

      {/* Skills chips (3 max + "+N") on the left, location/remote on the right. */}
      {(visibleSkills.length > 0 || location) && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {visibleSkills.map((s) => (
              <span key={s} className={chip}>
                {s}
              </span>
            ))}
            {extraSkills > 0 && (
              <span className="text-xs text-text-muted">
                {t('emplois.card.skills_more', lang, { n: extraSkills })}
              </span>
            )}
          </div>
          {location && <span className="shrink-0 text-xs text-text-muted">{location}</span>}
        </div>
      )}

      {/* "Voir →" — decorative (the whole card already navigates), so aria-hidden. */}
      <div className="mt-3 flex items-center justify-end border-t border-border-subtle pt-3">
        <span aria-hidden="true" className="inline-flex items-center gap-1 text-sm font-medium text-brand-accent">
          {t('emplois.card.view', lang)}
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}
