'use client'

import Link from 'next/link'
import { BlurFade } from '@/components/magicui/blur-fade'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { ArrowRightIcon } from '@/components/landing/icons'
import { BriefcaseIcon } from './icons'

export type MissionItem = {
  id: string
  title: string
  budgetMin: number | null
  budgetMax: number | null
  responseCount: number
}

// Budget is data, not copy — formatted with the TND code, no i18n key needed.
function formatBudget(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}-${max} TND`
  if (min != null) return `${min} TND`
  if (max != null) return `${max} TND`
  return '—'
}

// Right-rail card 2. Up to three of the consumer's open/filled job posts with their
// response counts, or an empty state nudging them to post one.
export function ActiveMissionsWidget({ missions }: { missions: MissionItem[] }) {
  const lang = useLang()

  return (
    <BlurFade delay={0.1} inView>
      <div className="rounded-xl border border-border-subtle bg-white p-4">
        <h3 className="text-sm font-semibold text-text-primary">
          {t('dashboard.rightRail.missions.heading', lang)}
        </h3>

        {missions.length === 0 ? (
          <div className="mt-3 text-center">
            <BriefcaseIcon className="mx-auto h-8 w-8 text-text-muted" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-text-primary">
              {t('dashboard.rightRail.missions.empty_title', lang)}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {t('dashboard.rightRail.missions.empty_subtitle', lang)}
            </p>
            <Link
              href="/poster-mission"
              className={`mt-3 inline-flex items-center justify-center rounded-lg bg-brand-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8] ${FOCUS_RING}`}
            >
              {t('dashboard.rightRail.missions.empty_cta', lang)}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-3 space-y-3">
              {missions.map((m, i) => (
                <li key={m.id} className={i > 0 ? 'border-t border-border-subtle pt-3' : ''}>
                  <p className="line-clamp-1 text-sm font-semibold text-text-primary">{m.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t('dashboard.rightRail.missions.responses', lang, {
                      count: m.responseCount,
                      budget: formatBudget(m.budgetMin, m.budgetMax),
                    })}
                  </p>
                </li>
              ))}
            </ul>
            <Link
              href="/mes-missions"
              className={`mt-3 inline-flex items-center gap-1 rounded text-xs font-medium text-brand-blue-600 hover:underline ${FOCUS_RING}`}
            >
              {t('dashboard.rightRail.missions.viewAll', lang)}
              <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
    </BlurFade>
  )
}
