// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))
vi.mock('@/components/FavoriteButton', () => ({
  FavoriteButton: ({ item_id }: { item_id: string }) => <button type="button" data-testid="heart" data-id={item_id} />,
}))

import { PublicServiceCard } from './PublicServiceCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import { t } from '@/lib/i18n'

afterEach(cleanup)

const service: ServiceListing = {
  id: 'svc-1',
  title: 'Création de boutique en ligne',
  description: 'Catalogue, panier et commande COD.',
  short_description: null,
  price_starting: 1500,
  price_unit: 'fixed',
  delivery_time: null,
  category: { name_fr: 'Développement', name_ar: 'تطوير' },
  freelancer: { full_name: 'Moatez Sahbeni', city: 'Tunis' },
}

describe('D4 375 — « ServiceCard / context=public »', () => {
  it('the whole card links to the service; the heart is outside the link (pressing it never navigates)', () => {
    render(<PublicServiceCard service={service} freelancerName="Moatez Sahbeni" freelancerAvatarUrl={null} lang="fr" />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/services/svc-1')
    expect(link).toHaveTextContent('Création de boutique en ligne')
    expect(link).not.toContainElement(screen.getByTestId('heart'))
    expect(screen.getByTestId('heart').dataset.id).toBe('svc-1')
  })

  it('FR: « À partir de » over the price, the category, the freelancer — and no « Voir le service » button', () => {
    render(<PublicServiceCard service={service} freelancerName="Moatez Sahbeni" freelancerAvatarUrl={null} lang="fr" />)
    expect(screen.getByText(t('service.from_price', 'fr'))).toBeInTheDocument()
    expect(screen.getByText(/1500/)).toBeInTheDocument()
    expect(screen.getByText('Développement')).toBeInTheDocument()
    expect(screen.getByText('Moatez Sahbeni')).toBeInTheDocument()
    expect(screen.queryByText(t('listing.service.viewCta', 'fr'))).toBeNull()
  })

  it('AR: the Arabic category name and the Arabic currency', () => {
    render(<PublicServiceCard service={service} freelancerName="Moatez Sahbeni" freelancerAvatarUrl={null} lang="ar" />)
    expect(screen.getByText('تطوير')).toBeInTheDocument()
    expect(screen.getByText(/د\.ت/)).toBeInTheDocument()
  })

  it('no price: « Prix sur demande » without a dangling « À partir de »', () => {
    render(<PublicServiceCard service={{ ...service, price_starting: null }} freelancerName="M" freelancerAvatarUrl={null} lang="fr" />)
    expect(screen.getByText(t('listing.service.priceOnRequest', 'fr'))).toBeInTheDocument()
    expect(screen.queryByText(t('service.from_price', 'fr'))).toBeNull()
  })

  it('the short description wins over the description', () => {
    render(<PublicServiceCard service={{ ...service, short_description: 'Résumé court' }} freelancerName="M" freelancerAvatarUrl={null} lang="fr" />)
    expect(screen.getByText('Résumé court')).toBeInTheDocument()
    expect(screen.queryByText('Catalogue, panier et commande COD.')).toBeNull()
  })
})
