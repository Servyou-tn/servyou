import { Check } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import type { FreelancerChecklist } from '@/lib/marche/freelancer-dashboard'
import { Panel } from './Panel'

// Checklist copy is 📐 MEASURED (167:12377, docs/design/h4-discovery.md §2) — exact strings, do
// not reword. The ring's own pixel spec (size/stroke/colour) was never part of that measured
// call; this is a plain stroke-dasharray SVG using locked tokens (brand-blue-600 progress /
// surface-sunken track), not a pixel match to a Figma ring component. Denominator is 4 — item 4
// ("Ajoutez 2 réalisations") always reads NOT DONE per Ruling 2, so 3-of-4 renders 75%, never
// 100%, until H3 ships freelancer_portfolio_items.
const ITEMS: { key: keyof FreelancerChecklist; labelKey: string }[] = [
  { key: 'avatar', labelKey: 'forceProfil.item_avatar' },
  { key: 'bio', labelKey: 'forceProfil.item_bio' },
  { key: 'skills', labelKey: 'forceProfil.item_skills' },
  { key: 'portfolio', labelKey: 'forceProfil.item_portfolio' },
]

function ProgressRing({ percent }: { percent: number }) {
  const size = 96
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 shrink-0"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        className="stroke-surface-sunken"
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        strokeLinecap="round"
        className="stroke-brand-blue-600"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  )
}

export function ForceDuProfil({ checklist, lang }: { checklist: FreelancerChecklist; lang: Lang }) {
  const doneCount = ITEMS.filter((item) => checklist[item.key]).length
  const percent = Math.round((doneCount / ITEMS.length) * 100)

  return (
    <Panel title={t('forceProfil.title', lang)}>
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <ProgressRing percent={percent} />
          <span className="absolute text-h3 font-bold text-text-primary">{percent}%</span>
        </div>
        <ul className="flex w-full flex-col gap-3">
          {ITEMS.map((item) => {
            const done = checklist[item.key]
            return (
              <li key={item.key} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    done ? 'bg-success-100 text-success-500' : 'bg-surface-sunken'
                  }`}
                >
                  {/* Checkmark only when done — showing it (even muted) on an unmet item reads as
                      "done" regardless of colour; unmet renders an empty circle instead. */}
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </span>
                <span className={`text-body-sm ${done ? 'text-text-primary' : 'text-text-muted'}`}>
                  {t(item.labelKey, lang)}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </Panel>
  )
}
