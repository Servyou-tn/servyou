/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { AnnonceResponse } from '@/lib/marche/annonce-detail'

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc: vi.fn() }) }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

import { AnnonceResponseCard } from './AnnonceResponseCard'

afterEach(cleanup)

const base: AnnonceResponse = {
  id: 'r1',
  freelancerId: 'f1',
  fullName: 'Moatez Sahbeni',
  headline: 'Designer',
  city: 'Tunis',
  proposalMessage: 'Mon approche pour votre logo.',
  createdAt: new Date().toISOString(),
  proposedPrice: null,
  proposedTimeframe: null,
  links: [],
  skills: [],
}

function view(over: Partial<AnnonceResponse> = {}, lang: 'fr' | 'ar' = 'fr') {
  return render(
    <LangProvider lang={lang}>
      <AnnonceResponseCard response={{ ...base, ...over }} annonceTitle="LOGO 3D" lang={lang} />
    </LangProvider>,
  )
}

describe('AnnonceResponseCard — the proposal terms (missions PR-4)', () => {
  it('a message-only proposal renders exactly as before: no terms block at all', () => {
    view()
    for (const key of ['annonces.detail.proposed_price', 'annonces.detail.proposed_timeframe', 'annonces.detail.proposal_links', 'annonces.detail.proposal_skills']) {
      expect(screen.queryByText(t(key, 'fr'))).not.toBeInTheDocument()
    }
  })

  it('shows price (pinned LTR), délai, links and skills', () => {
    view({
      proposedPrice: 80,
      proposedTimeframe: '5 jours',
      skills: ['Figma', 'Adobe'],
      links: [{ url: 'https://www.behance.net/me', label: 'Mon portfolio' }, { url: 'https://a.tn/x', label: null }],
    })
    expect(screen.getByText('80 TND')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('5 jours')).toBeInTheDocument()
    expect(screen.getByText('Figma')).toBeInTheDocument()
    expect(screen.getByText('Adobe')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Mon portfolio — behance.net' })
    expect(link).toHaveAttribute('href', 'https://www.behance.net/me')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow')
    expect(screen.getByRole('link', { name: 'a.tn' })).toBeInTheDocument()
  })

  it('a zero price is a real figure, not « none »', () => {
    view({ proposedPrice: 0 })
    expect(screen.getByText('0 TND')).toBeInTheDocument()
  })

  it('AR renders translated labels with no raw key', () => {
    view({ proposedPrice: 80, proposedTimeframe: '5 أيام', skills: ['Figma'], links: [{ url: 'https://a.tn', label: null }] }, 'ar')
    expect(document.body.textContent).not.toMatch(/annonces\.detail\./)
    expect(screen.getByText(t('annonces.detail.proposed_price', 'ar'))).toBeInTheDocument()
  })
})
