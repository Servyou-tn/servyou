/**
 * @vitest-environment jsdom
 *
 * /contact × ServYou's social accounts (founder decisions 2026-11-15, frontend audit C2) — mock-only. The « Réseaux sociaux »
 * card links to Facebook then Instagram in a new tab, each named for screen readers; no WhatsApp channel, no « Bientôt
 * disponible ». The form and the copy button are stubbed: this test is about the cards.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { t } from '@/lib/i18n'

const lang = vi.hoisted(() => ({ current: 'fr' as 'fr' | 'ar' | 'en' }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => lang.current }))
vi.mock('./ContactForm', () => ({ ContactForm: () => null }))
vi.mock('./CopyableEmail', () => ({ CopyableEmail: ({ email }: { email: string }) => <span>{email}</span> }))

import ContactPage from './page'

afterEach(cleanup)

describe('/contact — social accounts', () => {
  it.each(['fr', 'ar', 'en'] as const)('%s: Facebook then Instagram, new tab, named; no WhatsApp', async (l) => {
    lang.current = l
    render(await ContactPage())
    const card = screen.getByText(t('contact.methods.social.label', l)).parentElement as HTMLElement
    const links = within(card).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      'https://www.facebook.com/profile.php?id=61568691241876',
      'https://www.instagram.com/servyou.tn/',
    ])
    for (const [i, name] of ['Facebook', 'Instagram'].entries()) {
      expect(links[i]).toHaveAttribute('target', '_blank')
      expect(links[i]).toHaveAttribute('rel', 'noopener noreferrer')
      expect(links[i]).toHaveAccessibleName(t('contact.methods.social.link_aria', l, { platform: name }))
    }
    expect(document.body.innerHTML).not.toContain('wa.me')
  })
})
