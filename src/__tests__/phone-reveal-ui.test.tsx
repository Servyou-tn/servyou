// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Phone reveal rule UI (2026-11-01, docs/follow-ups/phone-reveal-ui.md on fix/phone-reveal-rule): get_contact_phone answers NULL for a buyer on a pending order,
// for an order cancelled while pending, and for a freelancer asking for a client's number through a mission. Every page that used to show a WhatsApp button
// for those must show the hint (or nothing) — never a button that can only fail. Mocks only; the database side is A's live tests.

vi.mock('@/components/LangProvider', () => ({ useLang: () => 'fr' }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc: vi.fn() }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }))
vi.mock('@/app/mes-propositions/actions', () => ({ withdrawProposalAction: vi.fn() }))

import { SellerPanel } from '@/app/mes-commandes/[id]/_components/OrderPanels'
import { PrimaryCta } from '@/app/freelance/[id]/_components/PrimaryCta'
import { ProposalActions } from '@/app/mes-propositions/_components/ProposalActions'

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

const order = (status: string, orderType: 'product' | 'service' = 'service') =>
  ({
    id: '3cf896e1-0000-4000-8000-000000000000',
    orderType,
    status,
    item: { title: 'Logo professionnel' },
    seller: { type: orderType === 'product' ? 'shop' : 'freelancer', id: 'seller-1', linkId: null, name: 'Zina', city: 'Tunis', logoUrl: null, headline: 'Designer' },
  }) as never

describe('/mes-commandes/[id] — the Vendeur / Freelance panel', () => {
  const contact = () => screen.queryByRole('button', { name: /Contacter/ })

  it('service order, pending: the hint « …par le freelance », no button', () => {
    render(<SellerPanel order={order('pending')} phone={null} lang="fr" />)
    expect(contact()).toBeNull()
    expect(screen.getByText('Disponible après acceptation par le freelance')).toBeInTheDocument()
  })

  it('product order, pending: the hint « …par le vendeur », no button', () => {
    render(<SellerPanel order={order('pending', 'product')} phone={null} lang="fr" />)
    expect(contact()).toBeNull()
    expect(screen.getByText('Disponible après acceptation par le vendeur')).toBeInTheDocument()
  })

  it('accepted: the button and the number row, no hint', () => {
    render(<SellerPanel order={order('accepted')} phone="+21620123456" lang="fr" />)
    expect(contact()).toBeInTheDocument()
    expect(screen.queryByText(/Disponible après acceptation/)).toBeNull()
  })

  it('cancelled: neither', () => {
    render(<SellerPanel order={order('cancelled')} phone={null} lang="fr" />)
    expect(contact()).toBeNull()
    expect(screen.queryByText(/Disponible après acceptation/)).toBeNull()
  })

  it('AR: the hint is translated', () => {
    render(<SellerPanel order={order('pending')} phone={null} lang="ar" />)
    expect(screen.getByText('متاح بعد قبول المستقل')).toBeInTheDocument()
  })
})

describe('/freelance/[id] — the primary CTA', () => {
  const props = { freelancerProfileId: 'fp', freelancerName: 'Aya', serviceCount: 3, lang: 'fr' as const }

  it('a pending request: the hint instead of « Demander un service » (which would read as asking twice)', () => {
    render(<PrimaryCta {...props} contactPhone={null} firstServiceId="svc-1" pendingRequest />)
    expect(screen.getByText('Disponible après acceptation par le freelance')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Demander un service/ })).toBeNull()
  })

  it('no request yet: « Demander un service »', () => {
    render(<PrimaryCta {...props} contactPhone={null} firstServiceId="svc-1" />)
    expect(screen.getByRole('link', { name: /Demander un service/ }).getAttribute('href')).toBe('/demander/svc-1')
    expect(screen.queryByText(/Disponible après acceptation/)).toBeNull()
  })

  it('an accepted request / a mission proposal (a phone exists): the WhatsApp button wins, even if a second request is pending', () => {
    render(<PrimaryCta {...props} contactPhone="+21620123456" firstServiceId="svc-1" pendingRequest />)
    expect(screen.getByRole('button', { name: /WhatsApp/ })).toBeInTheDocument()
    expect(screen.queryByText(/Disponible après acceptation/)).toBeNull()
  })
})

describe('the freelancer never gets the client’s number through a mission', () => {
  it('« Mes propositions » rows have no WhatsApp control, live or closed', () => {
    for (const state of ['open', 'filled', 'expired', 'unavailable'] as const) {
      const { unmount } = render(<ProposalActions responseId="r1" jobPostId="j1" state={state} title="Logo" lang="fr" />)
      expect(screen.queryByRole('button', { name: /whatsapp/i })).toBeNull()
      expect(screen.queryByRole('img', { name: /whatsapp/i })).toBeNull()
      unmount()
    }
  })

  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

  it('the H13 recap and the proposals list do not ask get_contact_phone for the client at all', () => {
    for (const file of [
      'src/app/missions/[id]/proposition-envoyee/page.tsx',
      'src/app/mes-propositions/_components/ProposalActions.tsx',
      'src/app/mes-propositions/_components/ProposalRow.tsx',
    ]) {
      const source = read(file)
      expect(source, file).not.toMatch(/WhatsAppContactButton|get_contact_phone|wa\.me/)
    }
  })

  it('H13 « Proposition envoyée » promises the client contacts THEM, not the other way round (FR + AR)', async () => {
    const { t } = await import('@/lib/i18n')
    expect(t('proposal.sent.step2', 'fr')).toBe("Le client vous contactera sur WhatsApp s'il retient votre proposition.")
    expect(t('proposal.sent.step2', 'ar')).toContain('واتساب')
    expect(t('proposal.sent.step2', 'fr')).not.toMatch(/contacter directement/)
  })
})
