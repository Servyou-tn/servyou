/**
 * @vitest-environment jsdom
 *
 * Landing footer × ServYou's social accounts (founder decisions 2026-11-15, frontend audit C2) — mock-only. The logos are
 * real links to the accounts in lib/contact/social-accounts.ts (new tab, named for screen readers), WhatsApp is gone, and an
 * account without a real address is not shown at all.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { t } from '@/lib/i18n'
import { SOCIAL_ACCOUNTS } from '@/lib/contact/social-accounts'
import { LandingFooter } from './LandingFooter'

const lang = vi.hoisted(() => ({ current: 'fr' as 'fr' | 'ar' | 'en' }))
vi.mock('./useLangSwitch', () => ({ useLangSwitch: () => ({ lang: lang.current, pending: false, switchTo: () => {} }) }))

afterEach(cleanup)

describe('SOCIAL_ACCOUNTS', () => {
  it('Facebook then Instagram, the founder\'s addresses; every account is an https link on its own platform; no WhatsApp', () => {
    expect(SOCIAL_ACCOUNTS.map((a) => [a.platform, a.url])).toEqual([
      ['facebook', 'https://www.facebook.com/profile.php?id=61568691241876'],
      ['instagram', 'https://www.instagram.com/servyou.tn/'],
    ])
    for (const account of SOCIAL_ACCOUNTS) {
      const url = new URL(account.url)
      expect(url.protocol).toBe('https:')
      expect(url.hostname).toBe(`www.${account.platform}.com`)
    }
    expect(SOCIAL_ACCOUNTS.map((a) => a.platform as string)).not.toContain('whatsapp')
  })
})

describe('LandingFooter — social links', () => {
  it.each(['fr', 'ar', 'en'] as const)('%s: one link per account, new tab, named, nothing else in the list', (l) => {
    lang.current = l
    render(<LandingFooter />)
    const list = screen.getByRole('list', { name: t('contact.methods.social.label', l) })
    const links = within(list).getAllByRole('link')
    expect(links).toHaveLength(SOCIAL_ACCOUNTS.length)
    SOCIAL_ACCOUNTS.forEach((account, i) => {
      expect(links[i]).toHaveAttribute('href', account.url)
      expect(links[i]).toHaveAttribute('target', '_blank')
      expect(links[i]).toHaveAttribute('rel', 'noopener noreferrer')
      expect(links[i]).toHaveAccessibleName(t('contact.methods.social.link_aria', l, { platform: account.name }))
    })
    expect(list.innerHTML).not.toContain('whatsapp')
  })
})
