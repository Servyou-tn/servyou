/**
 * @vitest-environment jsdom
 *
 * Walk 2026-11-02 #33 + the goal journey: « Voir mon profil public » opens a freelancer's own public page and is not offered to anyone
 * else (it opened the private /mon-compte for every role); a logged-out visitor's « Se connecter » brings them back to the page they
 * were on. Mocked: no network.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { createElement } from 'react'

const h = vi.hoisted(() => ({ pathname: '/produits/p-1' }))
vi.mock('next/navigation', () => ({ usePathname: () => h.pathname, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href, ...rest }, children as never),
}))
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => createElement('img', { alt }) }))

import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { TopbarUserMenu } from './TopbarUserMenu'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'

afterEach(cleanup)

const base: TopBarUser = { id: 'u-1', email: 'me@example.com', full_name: 'Yassine Ben Ali', seller_type: null, avatar_url: null }
const ITEM = t('shell.topbar.menu.viewPublicProfile', 'fr')

function openMenu(user: TopBarUser, role: 'consumer' | 'freelancer' | 'shop_owner') {
  render(
    <LangProvider lang="fr">
      <TopbarUserMenu user={user} role={role} />
    </LangProvider>,
  )
  fireEvent.keyDown(screen.getByRole('button', { name: t('nav.account', 'fr') }), { key: 'Enter' })
}

describe('TopbarUserMenu — « Voir mon profil public »', () => {
  it('a freelancer gets their own public page /freelance/[id]', async () => {
    openMenu({ ...base, seller_type: 'freelancer', freelancer_profile_id: 'fp-9' }, 'freelancer')
    expect(await screen.findByRole('menuitem', { name: ITEM })).toHaveAttribute('href', '/freelance/fp-9')
    expect(screen.queryByRole('menuitem', { name: ITEM })?.getAttribute('href')).not.toBe('/profil')
  })

  it('a consumer and a shop owner have no public page, so the item is not offered', async () => {
    openMenu(base, 'consumer')
    expect(await screen.findByRole('menuitem', { name: t('shell.topbar.menu.settings', 'fr') })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: ITEM })).toBeNull()
    cleanup()
    openMenu({ ...base, seller_type: 'shop_owner' }, 'shop_owner')
    expect(await screen.findByRole('menuitem', { name: t('shell.topbar.menu.settings', 'fr') })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: ITEM })).toBeNull()
  })

  it('a freelancer whose profile id could not be read gets no item, never a broken link', async () => {
    openMenu({ ...base, seller_type: 'freelancer', freelancer_profile_id: null }, 'freelancer')
    expect(await screen.findByRole('menuitem', { name: t('shell.topbar.menu.settings', 'fr') })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: ITEM })).toBeNull()
  })
})

describe('TopbarUserMenu — logged out', () => {
  it('« Se connecter » carries ?next= so the visitor lands back on this page', () => {
    h.pathname = '/produits/p-1'
    render(
      <LangProvider lang="fr">
        <TopbarUserMenu user={null} role="consumer" />
      </LangProvider>,
    )
    expect(screen.getByRole('link', { name: t('nav.login', 'fr') })).toHaveAttribute('href', `/connexion?next=${encodeURIComponent('/produits/p-1')}`)
  })
})
