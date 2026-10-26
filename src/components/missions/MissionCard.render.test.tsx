import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import type { MissionSummary } from '@/lib/marche/missions-query'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

const { MissionCard } = await import('./MissionCard')
const { CompetitionPill } = await import('./CompetitionPill')

const mission: MissionSummary = {
  id: '2594f4bd-355d-4e6b-86cc-a38daf739c38',
  title: 'VIDEO UGC',
  excerpt: 'Un court montage',
  budgetMin: 120,
  budgetMax: 200,
  city: 'Le Kef',
  isRemote: false,
  responseCount: 2,
  categorySlug: 'design-graphique-logo',
  categoryNameFr: 'Design graphique & logo',
  categoryNameAr: 'التصميم الجرافيكي',
  skills: ['After Effects'],
  clientFirstName: 'Mehdi',
  clientCity: 'Tunis',
  isNew: true,
  daysLeft: 30,
}

describe('MissionCard render (FR + AR)', () => {
  it('FR: chip, Nouveau, budget range, low-competition pill, 2/10, expiry, link to the detail', () => {
    const out = renderToString(createElement(MissionCard, { mission, lang: 'fr' }))
    expect(out).toContain('Design graphique &amp; logo')
    expect(out).toContain('Nouveau')
    expect(out).toContain('120 – 200 TND')
    expect(out).toContain('Peu de concurrence')
    expect(out).toContain('2/10 réponses')
    expect(out).toContain('Expire dans 30j')
    expect(out).toContain('Le Kef')
    expect(out).toContain('Mehdi · Tunis')
    expect(out).toContain(`href="/missions/${mission.id}"`)
  })

  it('numeric runs are pinned LTR (budget and the n/10 caption) so AR does not reorder them', () => {
    const out = renderToString(createElement(MissionCard, { mission, lang: 'ar' }))
    expect(out).toMatch(/dir="ltr"[^>]*>120 – 200 د\.ت</)
    expect(out).toMatch(/dir="ltr"[^>]*>2\/10 عروض</)
  })

  it('AR: translated, no raw i18n key leaks', () => {
    const out = renderToString(createElement(MissionCard, { mission, lang: 'ar' }))
    expect(out).toContain('التصميم الجرافيكي')
    expect(out).toContain('منافسة قليلة')
    expect(out).not.toMatch(/\b(missioncard|competition|jobbudget|missionboard)\.[a-z_]+/)
  })

  it('no « Nouveau » when old, remote replaces the city, and a budget-less post says so (without ltr)', () => {
    const out = renderToString(
      createElement(MissionCard, { mission: { ...mission, isNew: false, isRemote: true, budgetMin: null, budgetMax: null, clientFirstName: '' }, lang: 'fr' }),
    )
    expect(out).not.toContain('Nouveau')
    expect(out).toContain('Télétravail accepté')
    expect(out).not.toContain('Le Kef')
    expect(out).toContain('Budget à discuter')
    expect(out).not.toMatch(/dir="ltr"[^>]*>Budget/)
    expect(out).toContain('Client · Tunis')
  })
})

describe('CompetitionPill', () => {
  it.each([
    [3, 'Peu de concurrence', 'bg-success-100'],
    [5, 'Concurrence moyenne', 'bg-warning-100'],
    [9, 'Forte concurrence', 'bg-danger-100'],
  ] as const)('%i responses → %s', (n, label, cls) => {
    const out = renderToString(createElement(CompetitionPill, { responseCount: n, lang: 'fr' }))
    expect(out).toContain(label)
    expect(out).toContain(cls)
  })
})
