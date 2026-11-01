// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { SocialLinksSection, type ShopSocialValues } from './SocialLinksSection'

afterEach(cleanup)

const empty: ShopSocialValues = { facebook: '', instagram: '', tiktok: '' }

function renderSection(lang: 'fr' | 'ar', values = empty, errors = {}, onChange = vi.fn()) {
  return render(
    <LangProvider lang={lang}>
      <SocialLinksSection values={values} errors={errors} onChange={onChange} />
    </LangProvider>,
  )
}

describe('G3 « Réseaux sociaux (optionnel) »', () => {
  it('closed by default, « Optionnel » while all three are empty', () => {
    renderSection('fr')
    expect(document.querySelector('details')!.open).toBe(false)
    expect(screen.getByText(t('boutique.config.badge_optional', 'fr'))).toBeInTheDocument()
  })

  it('« Complété » once one link is set', () => {
    renderSection('fr', { ...empty, instagram: 'https://instagram.com/amira' })
    expect(screen.getByText(t('shop.edit.social.badge_complete', 'fr'))).toBeInTheDocument()
  })

  it('three labelled fields, in the frame order, each LTR with a URL keyboard', () => {
    renderSection('fr')
    const fields = [
      screen.getByLabelText(t('shop.edit.social.facebook_label', 'fr')),
      screen.getByLabelText(t('shop.edit.social.instagram_label', 'fr')),
      screen.getByLabelText(t('shop.edit.social.tiktok_label', 'fr')),
    ]
    for (const f of fields) {
      expect(f).toHaveAttribute('dir', 'ltr')
      expect(f).toHaveAttribute('inputmode', 'url')
    }
    expect(fields[0].compareDocumentPosition(fields[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('opens by itself when a field has an error, and shows it on that field', () => {
    renderSection('fr', { ...empty, tiktok: 'tiktok.com@evil' }, { tiktok: 'lien refusé' })
    expect(document.querySelector('details')!.open).toBe(true)
    const field = screen.getByLabelText(t('shop.edit.social.tiktok_label', 'fr'))
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('lien refusé')).toBeInTheDocument()
  })

  it('typing reports the platform and the raw value', () => {
    const onChange = vi.fn()
    renderSection('fr', empty, {}, onChange)
    fireEvent.change(screen.getByLabelText(t('shop.edit.social.facebook_label', 'fr')), { target: { value: 'facebook.com/amira' } })
    expect(onChange).toHaveBeenCalledWith('facebook', 'facebook.com/amira')
  })

  it('AR: translated title and labels, no raw key', () => {
    renderSection('ar')
    expect(screen.getByText(t('shop.edit.social.title', 'ar'))).toBeInTheDocument()
    expect(screen.getByLabelText(t('shop.edit.social.instagram_label', 'ar'))).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/shop\.edit\.social\./)
  })
})
