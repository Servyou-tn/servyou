import { Clock, Globe, MapPin } from 'lucide-react'
import { t, tn, type Lang } from '@/lib/i18n'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { formatJobBudget, hasJobBudget } from '@/lib/marche/format-job-budget'
import { localizeCity } from '@/lib/marche/missions'
import { CompetitionPill } from './CompetitionPill'
import { SkillChip } from './MissionChips'

// decision-card — Figma 323:11838 (docs/design/h9-h13-measurements.md §2.1): surface/base, 1 px border/subtle,
// radius xl, pad 24, gap 16, three hairline dividers. Budget (Bold 32) · competition · required skills ·
// localisation / expiry rows · the CTA slot (`children`). H12's recap-card is the same data minus the CTA, so
// this is shared rather than rebuilt then.
export type MissionFactsData = {
  budgetMin: number | null
  budgetMax: number | null
  city: string | null
  isRemote: boolean
  responseCount: number
  skills: string[]
  daysLeft: number
}

function Divider() {
  return <hr className="border-0 border-t border-border-subtle" />
}

export function MissionFacts({
  mission,
  lang,
  lead,
  children,
}: {
  mission: MissionFactsData
  lang: Lang
  /** H12's recap opens with « LA MISSION » · category · title, then a divider. */
  lead?: React.ReactNode
  children?: React.ReactNode
}) {
  const budget = formatJobBudget(mission.budgetMin, mission.budgetMax, lang)
  const place = mission.isRemote ? t('missioncard.remote', lang) : (localizeCity(mission.city, lang) ?? t('missiondetail.location_unspecified', lang))

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
      {lead ? (
        <>
          {lead}
          <Divider />
        </>
      ) : null}
      <div className="flex flex-col gap-0.5">
        <p className="text-caption font-medium text-text-muted">{t('missiondetail.budget_label', lang)}</p>
        {/* The figure is isolated LTR inside the paragraph (not dir on the <p>, which would flip text-start to the left in
            AR and strand it under the right-aligned label). */}
        <p className="text-start text-h1 text-text-primary">
          {hasJobBudget(mission.budgetMin, mission.budgetMax) ? <span dir="ltr">{budget}</span> : budget}
        </p>
      </div>

      <Divider />

      <div className="flex flex-wrap items-center gap-1.5">
        <CompetitionPill responseCount={mission.responseCount} lang={lang} />
        <span dir="ltr" className="text-caption font-medium text-text-muted">
          {t('competition.count_spaced', lang, { count: mission.responseCount, max: MAX_RESPONSES_PER_POST })}
        </span>
      </div>

      {mission.skills.length > 0 ? (
        <>
          <Divider />
          <div className="flex flex-col gap-2">
            <p className="text-caption font-medium text-text-muted">{t('missiondetail.skills_label', lang)}</p>
            <div className="flex flex-wrap gap-2">
              {mission.skills.map((skill) => (
                <SkillChip key={skill}>{skill}</SkillChip>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <Divider />

      <dl className="flex flex-col gap-3 text-body-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 font-medium text-text-secondary">
            {mission.isRemote ? <Globe className="size-4 shrink-0" aria-hidden="true" /> : <MapPin className="size-4 shrink-0" aria-hidden="true" />}
            {t('missiondetail.location_label', lang)}
          </dt>
          <dd className="text-end font-semibold text-text-primary">{place}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-1.5 font-medium text-text-secondary">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {t('missiondetail.expires_label', lang)}
          </dt>
          <dd className="text-end font-semibold text-text-primary">{tn('missiondetail.expires_value', lang, mission.daysLeft)}</dd>
        </div>
      </dl>

      {/* The frame's three dividers separate budget · competition · skills · meta; the CTA follows meta at gap 16. */}
      {children}
    </section>
  )
}
