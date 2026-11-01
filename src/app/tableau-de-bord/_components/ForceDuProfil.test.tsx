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

import { ForceDuProfil } from './ForceDuProfil'
import { t } from '@/lib/i18n'

afterEach(cleanup)

const none = { avatar: false, bio: false, skills: false, links: false, portfolio: false }
const all = { avatar: true, bio: true, skills: true, links: true, portfolio: true }

describe('ForceDuProfil — every item still to do opens H3 on the section that fixes it', () => {
  it.each([
    ['forceProfil.item_avatar', '/mon-profil-freelance/modifier?section=photo'],
    ['forceProfil.item_bio', '/mon-profil-freelance/modifier?section=bio'],
    ['forceProfil.item_skills', '/mon-profil-freelance/modifier?section=competences'],
    ['forceProfil.item_portfolio', '/mon-profil-freelance/modifier?section=realisations'],
    ['forceProfil.item_links', '/mon-profil-freelance/modifier?section=liens'],
  ])('%s → %s', (key, href) => {
    render(<ForceDuProfil checklist={none} lang="fr" />)
    expect(screen.getByRole('link', { name: t(key, 'fr') }).getAttribute('href')).toBe(href)
  })

  it('a done item is plain text, not a link', () => {
    render(<ForceDuProfil checklist={{ ...none, bio: true, links: true }} lang="fr" />)
    expect(screen.queryByRole('link', { name: t('forceProfil.item_bio', 'fr') })).toBeNull()
    expect(screen.queryByRole('link', { name: t('forceProfil.item_links', 'fr') })).toBeNull()
    expect(screen.getByText(t('forceProfil.item_bio', 'fr'))).toBeInTheDocument()
    expect(screen.getByRole('link', { name: t('forceProfil.item_avatar', 'fr') })).toBeInTheDocument()
  })

  it('the footer « Compléter mon profil » is a real link to H3 — no longer an inert span', () => {
    render(<ForceDuProfil checklist={none} lang="fr" />)
    expect(screen.getByRole('link', { name: t('forceProfil.complete_link', 'fr') }).getAttribute('href')).toBe('/mon-profil-freelance/modifier')
    expect(document.querySelector('[aria-disabled="true"]')).toBeNull()
  })

  it('everything done: 100 %, no item link (only the footer)', () => {
    render(<ForceDuProfil checklist={all} lang="fr" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('two of five done = 40 %', () => {
    render(<ForceDuProfil checklist={{ ...none, avatar: true, links: true }} lang="fr" />)
    expect(screen.getByText('40%')).toBeInTheDocument()
  })

  it('AR: translated labels, same targets, chevrons flip, no raw key', () => {
    render(<ForceDuProfil checklist={none} lang="ar" />)
    expect(screen.getByRole('link', { name: t('forceProfil.item_links', 'ar') }).getAttribute('href')).toBe('/mon-profil-freelance/modifier?section=liens')
    expect(document.body.textContent).not.toMatch(/forceProfil\./)
    expect(document.querySelector('svg.rtl\\:rotate-180')).not.toBeNull()
  })
})
