/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { AnnonceResponse } from '@/lib/marche/annonce-detail'

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc: vi.fn() }) }))
vi.mock('next/image', () => ({ default: () => null }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

import { AnnonceResponseCard } from './AnnonceResponseCard'

afterEach(cleanup)

const NOW = Date.parse('2026-10-30T12:00:00.000Z')

const base: AnnonceResponse = {
  id: 'r1',
  freelancerId: 'f1',
  freelancerProfileId: 'fp-1',
  fullName: 'Moatez Sahbeni',
  headline: 'Designer',
  city: 'Tunis',
  proposalMessage: 'Mon approche pour votre logo.',
  createdAt: new Date(NOW - 3 * 3_600_000).toISOString(),
  proposedPrice: null,
  proposedTimeframe: null,
  links: [],
  skills: [],
}

function view(over: Partial<AnnonceResponse> = {}, lang: 'fr' | 'ar' = 'fr') {
  return render(
    <LangProvider lang={lang}>
      <AnnonceResponseCard response={{ ...base, ...over }} annonceTitle="LOGO 3D" lang={lang} now={NOW} />
    </LangProvider>,
  )
}

describe('AnnonceResponseCard — the proposal terms (missions PR-4)', () => {
  it('a message-only proposal renders exactly as before: no terms block at all', () => {
    const { container } = view()
    // The price / délai labels render as « Prix proposé : » — query the <dl> itself, a bare-label query would pass vacuously.
    expect(container.querySelector('dl')).toBeNull()
    for (const key of ['annonces.detail.proposal_links', 'annonces.detail.proposal_skills']) {
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
    expect(screen.getByText(`${t('annonces.detail.proposed_price', 'ar')} :`)).toBeInTheDocument()
  })

  it('AR prices read د.ت, not TND, inside an isolated LTR run', () => {
    view({ proposedPrice: 80 }, 'ar')
    const price = screen.getByText('80 د.ت')
    expect(price.tagName).toBe('BDI')
    expect(price).toHaveAttribute('dir', 'ltr')
  })
})

describe('AnnonceResponseCard — F4 anatomy (PR-2)', () => {
  it('the received-ago line is measured against the SERVER clock passed in, not Date.now()', () => {
    view()
    expect(screen.getByText('Proposition reçue il y a 3h')).toBeInTheDocument()
  })

  it("FR reads mid-sentence: « reçue hier » / « reçue à l'instant », not « reçue Hier »", () => {
    view({ createdAt: new Date(NOW - 30 * 3_600_000).toISOString() })
    expect(screen.getByText('Proposition reçue hier')).toBeInTheDocument()
    cleanup()
    view({ createdAt: new Date(NOW - 60_000).toISOString() })
    expect(screen.getByText("Proposition reçue à l'instant")).toBeInTheDocument()
  })

  it('« Voir le profil » goes to /freelance/<freelancer_profiles.id> — never the profiles.id the response stores', () => {
    view()
    expect(screen.getByRole('link', { name: t('annonces.detail.view_profile', 'fr') })).toHaveAttribute('href', '/freelance/fp-1')
  })

  it('no readable freelancer profile (moderated) → no « Voir le profil » link at all', () => {
    view({ freelancerProfileId: null })
    expect(screen.queryByRole('link', { name: t('annonces.detail.view_profile', 'fr') })).not.toBeInTheDocument()
  })

  it('a short message has no toggle; a long one is clamped and expands / collapses', () => {
    view({ proposalMessage: 'Court.' })
    expect(screen.queryByRole('button', { name: t('annonces.detail.msg_more', 'fr') })).not.toBeInTheDocument()
    cleanup()

    const long = 'mot '.repeat(80)
    view({ proposalMessage: long })
    const more = screen.getByRole('button', { name: t('annonces.detail.msg_more', 'fr') })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    const para = document.querySelector('p.line-clamp-3')
    expect(para).not.toBeNull()
    fireEvent.click(more)
    expect(screen.getByRole('button', { name: t('annonces.detail.msg_less', 'fr') })).toHaveAttribute('aria-expanded', 'true')
    expect(document.querySelector('p.line-clamp-3')).toBeNull()
  })
})
