/**
 * @vitest-environment jsdom
 *
 * PR-2: the two proposal CTAs on /missions/[id] are real links now (no « Bientôt »), and the H13 recap hides what was not sent.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { parseSentLinks, type SentProposal } from '@/lib/marche/sent-proposal-query'
import type { MissionCtaState } from '@/lib/marche/mission-cta'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }))

import { MissionCta } from './_components/MissionCta'
import { SentRecap } from './proposition-envoyee/_components/SentRecap'

afterEach(cleanup)
const ID = '2594f4bd-355d-4e6b-86cc-a38daf739c38'

function cta(state: MissionCtaState, lang: 'fr' | 'ar' = 'fr', answeredAt: string | null = null) {
  return render(
    <LangProvider lang={lang}>
      <MissionCta state={state} missionId={ID} answeredAt={answeredAt} lang={lang} />
    </LangProvider>,
  )
}

describe('MissionCta — PR-2 enables the proposal CTAs', () => {
  it('can_respond → « Envoyer ma proposition » is a link to H12, with no « Bientôt »', () => {
    cta('can_respond')
    const link = screen.getByRole('link', { name: t('missiondetail.cta.send', 'fr') })
    expect(link).toHaveAttribute('href', `/missions/${ID}/proposer`)
    expect(document.body.textContent).not.toMatch(/Bientôt/)
  })

  it('answered → the approved copy, and « Voir ma proposition » is a link to H13', () => {
    cta('answered')
    expect(screen.getByText('Vous avez déjà répondu à cette mission')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: t('missiondetail.cta.view_mine', 'fr') })).toHaveAttribute('href', `/missions/${ID}/proposition-envoyee`)
  })

  it('own post → the approved copy', () => {
    cta('own_post')
    expect(screen.getByText("C'est votre propre annonce : vous ne pouvez pas y répondre.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: t('missiondetail.cta.send', 'fr') })).not.toBeInTheDocument()
  })

  it.each(['cap_active', 'full', 'filled', 'expired', 'closed', 'no_profile'] as const)('%s: the send button is NOT a link', (state) => {
    cta(state)
    expect(screen.queryByRole('link', { name: t('missiondetail.cta.send', 'fr') })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('missiondetail.cta.send', 'fr') })).toBeDisabled()
  })

  it('AR renders without raw keys', () => {
    cta('can_respond', 'ar')
    expect(document.body.textContent).not.toMatch(/missiondetail\./)
  })
})

const sent = (over: Partial<SentProposal> = {}): SentProposal => ({
  id: 'r1',
  createdAt: '2026-10-26T13:32:00Z',
  message: 'Bonjour, voici ma proposition détaillée pour votre logo.',
  price: null,
  timeframe: null,
  links: [],
  skills: [],
  mission: { id: ID, title: 'LOGO 3D', consumerId: 'c1', categorySlug: 'design-graphique-logo', categoryNameFr: 'Design', categoryNameAr: 'تصميم', responseCount: 3 },
  clientFirstName: 'Mehdi',
  ...over,
})

describe('H13 SentRecap', () => {
  const view = (s: SentProposal, lang: 'fr' | 'ar' = 'fr') =>
    render(
      <LangProvider lang={lang}>
        <SentRecap sent={s} lang={lang} />
      </LangProvider>,
    )

  it('a message-only proposal shows no links / skills / price / délai rows at all', () => {
    view(sent())
    for (const key of ['proposal.sent.links', 'proposal.sent.skills', 'proposal.sent.price', 'proposal.sent.timeframe']) {
      expect(screen.queryByText(t(key, 'fr'))).not.toBeInTheDocument()
    }
    expect(screen.getByText('LOGO 3D')).toBeInTheDocument()
  })

  it('shows what was sent: price pinned LTR, délai, skills, links as « Label — domain » opening safely, and the Tunis time (14h32)', () => {
    view(
      sent({
        price: 80,
        timeframe: '5 jours',
        skills: ['Figma', 'Adobe'],
        links: [{ url: 'https://www.behance.net/me', label: 'Mon portfolio' }, { url: 'https://a.tn/x', label: null }],
      }),
    )
    expect(screen.getByText('80 TND')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('5 jours')).toBeInTheDocument()
    expect(screen.getByText('Figma')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Mon portfolio — behance.net' })
    expect(link).toHaveAttribute('href', 'https://www.behance.net/me')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toMatch(/noopener/)
    expect(screen.getByRole('link', { name: 'a.tn — a.tn' })).toBeInTheDocument()
    expect(screen.getByText(/Envoyée le 26 octobre 2026 à 14h32/)).toBeInTheDocument()
  })

  it('survives the post being gone (deleted / moderated): the recap still shows what was sent', () => {
    view(sent({ mission: null }))
    expect(screen.getByText(/voici ma proposition détaillée/)).toBeInTheDocument()
  })

  it('AR has no raw keys', () => {
    view(sent({ price: 80 }), 'ar')
    expect(document.body.textContent).not.toMatch(/proposal\./)
  })
})

describe('parseSentLinks (portfolio_links is jsonb)', () => {
  it('keeps well-formed entries, nulls blank labels, drops junk', () => {
    expect(parseSentLinks([{ url: 'https://a.tn', label: ' ' }, { url: 'https://b.tn', label: 'B' }, { label: 'no url' }, 'x', null, { url: 3 }])).toEqual([
      { url: 'https://a.tn', label: null },
      { url: 'https://b.tn', label: 'B' },
    ])
    expect(parseSentLinks(null)).toEqual([])
    expect(parseSentLinks({})).toEqual([])
  })
})
