import Link from 'next/link'
import { Check, ChevronRight } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import type { FreelancerChecklist } from '@/lib/marche/freelancer-dashboard'
import { EDIT_PROFILE_PATH, profileSectionHref, type ProfileSection } from '@/lib/freelancer/profile-sections'
import { FOCUS_RING } from '@/components/layout/styles'
import { Panel } from './Panel'

// Checklist copy is 📐 MEASURED (167:12377, docs/design/h4-discovery.md §2) — exact strings, do
// not reword. The ring's own pixel spec (size/stroke/colour) was never part of that measured
// call; this is a plain stroke-dasharray SVG using locked tokens (brand-blue-600 progress /
// surface-sunken track), not a pixel match to a Figma ring component. Denominator is 5 — the measured 4 plus
// « Ajoutez vos liens » (links kit, founder-approved; done when ≥ 1 link). « Ajoutez 2 réalisations » is done at
// ≥ 2 portfolio items (it read NOT DONE for ever before H3 shipped freelancer_portfolio_items — old Ruling 2), so the ring now reaches 100%.
//
// Every item NOT done is a link to H3 opened on the section that fixes it (`?section=`, lib/freelancer/profile-sections);
// done items are plain text. The footer « Compléter mon profil » opens H3 itself.
const ITEMS: { key: keyof FreelancerChecklist; labelKey: string; section: ProfileSection }[] = [
  { key: 'avatar', labelKey: 'forceProfil.item_avatar', section: 'photo' },
  { key: 'bio', labelKey: 'forceProfil.item_bio', section: 'bio' },
  { key: 'skills', labelKey: 'forceProfil.item_skills', section: 'competences' },
  { key: 'portfolio', labelKey: 'forceProfil.item_portfolio', section: 'realisations' },
  { key: 'links', labelKey: 'forceProfil.item_links', section: 'liens' },
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
                    done ? 'bg-success-100 text-success-500' : 'border-2 border-border-strong'
                  }`}
                >
                  {/* Checkmark only when done — showing it (even muted) on an unmet item reads as
                      "done" regardless of colour; unmet renders an outlined circle instead (📐
                      167:12371, figma-cli Safe Mode screenshot — was a filled surface-sunken
                      circle with no border, wrong). */}
                  {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </span>
                {done ? (
                  <span className="text-body-sm text-text-primary">{t(item.labelKey, lang)}</span>
                ) : (
                  <Link
                    href={profileSectionHref(item.section)}
                    className={`group/item relative flex min-w-0 flex-1 items-center justify-between gap-2 rounded text-body-sm text-text-muted transition-colors hover:text-brand-blue-600 ${FOCUS_RING}`}
                  >
                    <span className="group-hover/item:underline">{t(item.labelKey, lang)}</span>
                    <ChevronRight className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
                    {/* Touch target: the row stays as drawn (24 px); the hit area reaches 44 (touch-target rule). */}
                    <span aria-hidden="true" className="absolute inset-x-0 -inset-y-3" />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
        {/* Footer link, added Pass 3 — 167:12377's read (h4-discovery.md §2) stopped at the checklist, so this was never Figma-measured, only ruled by
            the founder off the frame's visible copy. It was an inert span while H3 had no route; H3 (/mon-profil-freelance/modifier) exists now. */}
        <Link href={EDIT_PROFILE_PATH} className={`relative rounded text-body-sm font-semibold text-text-muted transition-colors hover:text-brand-blue-600 hover:underline ${FOCUS_RING}`}>
          {t('forceProfil.complete_link', lang)}
          <span aria-hidden="true" className="absolute -inset-x-2 -inset-y-3" />
        </Link>
      </div>
    </Panel>
  )
}
