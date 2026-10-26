import Link from 'next/link'
import { Clock, Globe, MapPin, User } from 'lucide-react'
import { t, tn, type Lang } from '@/lib/i18n'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { formatJobBudget, hasJobBudget } from '@/lib/marche/format-job-budget'
import type { MissionSummary } from '@/lib/marche/missions-query'
import { localizeCity } from '@/lib/marche/missions'
import { FOCUS_RING } from '@/components/layout/styles'
import { CompetitionPill } from './CompetitionPill'
import { CategoryChip, NewChip, SkillChip } from './MissionChips'

// MissionCard — Figma 311:10264, measured in docs/design/h9-h13-measurements.md §1.2: surface/base, 1 px
// border/subtle, radius xl, pad 20, gap 12, no shadow at rest (hover: blue/600 border + shadow-xs, from memory,
// not re-read). The frame fixes it at 368 × 369; here it fills its grid cell and the footer is pinned by a spacer.
//
// Rulings: D-H9-1 the category chip is start-aligned whether or not « Nouveau » shows (the frame centres it —
// hidden-pill artefact) · D-H9-2 no « /mois » suffix (no period column). `isNew` / `daysLeft` arrive precomputed from the
// server clock. The whole card is one link (the « Voir la mission » anchor stretches over it).
export function MissionCard({ mission, lang }: { mission: MissionSummary; lang: Lang }) {
  const budget = formatJobBudget(mission.budgetMin, mission.budgetMax, lang)
  const budgetIsFigure = hasJobBudget(mission.budgetMin, mission.budgetMax)
  const clientName = mission.clientFirstName || t('missioncard.client_unknown', lang)
  const clientCity = localizeCity(mission.clientCity, lang)
  const clientLine = clientCity ? `${clientName} · ${clientCity}` : clientName

  return (
    <article className="relative flex h-full flex-col gap-3 rounded-xl border border-border-subtle bg-surface-base p-5 transition-[border-color,box-shadow] focus-within:border-brand-blue-600 hover:border-brand-blue-600 hover:shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <CategoryChip slug={mission.categorySlug} nameFr={mission.categoryNameFr} nameAr={mission.categoryNameAr} lang={lang} />
        {mission.isNew ? <NewChip lang={lang} /> : null}
      </div>

      {/* Title: Semi Bold 18 / 26, two lines reserved (52). Excerpt: Regular 14 / 21, two lines reserved (42). */}
      <h3 className="min-h-[52px] text-body-lg leading-[26px] font-semibold text-text-primary line-clamp-2">{mission.title}</h3>
      <p className="min-h-[42px] text-body-sm text-text-muted line-clamp-2">{mission.excerpt}</p>

      <div className="flex items-start justify-between gap-3">
        <p dir={budgetIsFigure ? 'ltr' : undefined} className="text-body-lg font-bold text-text-primary">
          {budget}
        </p>
        <div className="flex flex-col items-end gap-1 text-end">
          <CompetitionPill responseCount={mission.responseCount} lang={lang} />
          <span dir="ltr" className="text-caption text-text-muted">
            {t('competition.count', lang, { count: mission.responseCount, max: MAX_RESPONSES_PER_POST })}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption font-medium text-text-muted">
        {mission.isRemote ? (
          <span className="inline-flex items-center gap-1.5">
            <Globe className="size-4 shrink-0" aria-hidden="true" />
            {t('missioncard.remote', lang)}
          </span>
        ) : localizeCity(mission.city, lang) ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {localizeCity(mission.city, lang)}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4 shrink-0" aria-hidden="true" />
          {tn('missioncard.expires', lang, mission.daysLeft)}
        </span>
      </div>

      {mission.skills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {mission.skills.map((skill) => (
            <SkillChip key={skill}>{skill}</SkillChip>
          ))}
        </div>
      ) : null}

      <div className="flex-1" />

      <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption font-medium text-text-muted">
          <User className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{clientLine}</span>
        </span>
        <Link
          href={`/missions/${mission.id}`}
          className={`shrink-0 rounded-sm text-body-sm font-semibold text-brand-blue-600 after:absolute after:inset-0 after:content-[''] ${FOCUS_RING}`}
        >
          {t('missioncard.view', lang)}
        </Link>
      </div>
    </article>
  )
}
