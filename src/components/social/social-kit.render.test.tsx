// @vitest-environment jsdom
import * as React from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SocialLinks } from './SocialLinks'
import { PlatformLinkInput } from './PlatformLinkInput'
import { RecommendedPlatforms } from './RecommendedPlatforms'
import { LinksEditor, linkRowsToPayload, takenPlatforms, type LinkRow } from './LinksEditor'
import { PlatformIcon } from './PlatformIcon'
import { PLATFORM_IDS, LINKS_MAX, normalizeUrl } from '@/lib/social/platforms'

afterEach(cleanup)

const row = (url: string, hint: LinkRow['hint'] = null, id = url || `r${Math.random()}`): LinkRow => ({ id, url, hint })

describe('PlatformIcon', () => {
  it('draws a decorative glyph for every platform, and the globe for none', () => {
    for (const id of [...PLATFORM_IDS, null] as const) {
      const { container, unmount } = render(<PlatformIcon platform={id} />)
      const svg = container.querySelector('svg')
      expect(svg, String(id)).not.toBeNull()
      expect(svg?.getAttribute('aria-hidden')).toBe('true')
      expect(svg?.querySelector('path, circle'), String(id)).not.toBeNull()
      unmount()
    }
  })
})

describe('SocialLinks', () => {
  const links = [
    { id: '1', url: 'https://www.linkedin.com/in/aya' },
    { id: '2', url: 'https://aya.tn' },
  ]

  it('renders nothing for no links', () => {
    const { container } = render(<SocialLinks links={[]} name="Aya" lang="fr" />)
    expect(container.innerHTML).toBe('')
  })

  it('every link is a real, safe, named, new-tab anchor (FR)', () => {
    render(<SocialLinks links={links} name="Aya" lang="fr" />)
    const linkedin = screen.getByRole('link', { name: 'Profil LinkedIn de Aya' })
    expect(linkedin.getAttribute('href')).toBe('https://www.linkedin.com/in/aya')
    expect(linkedin.getAttribute('target')).toBe('_blank')
    expect(linkedin.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Site web de Aya' }).getAttribute('href')).toBe('https://aya.tn')
  })

  it('names the links in Arabic with no French left', () => {
    render(<SocialLinks links={links} name="آية" lang="ar" />)
    expect(screen.getByRole('link', { name: 'ملف LinkedIn الخاص بـ آية' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'الموقع الإلكتروني لـ آية' })).toBeTruthy()
  })

  it('has a 44px phone tap target and a focus ring', () => {
    render(<SocialLinks links={links} name="Aya" lang="fr" />)
    const cls = screen.getAllByRole('link')[0].className
    expect(cls).toContain('size-11')
    expect(cls).toMatch(/focus-visible/)
  })
})

describe('PlatformLinkInput', () => {
  const glyphOf = (c: HTMLElement) => c.querySelector('svg path')?.getAttribute('d') ?? ''
  const paint = (value: string, hint: LinkRow['hint'] = null) => {
    const { container, unmount } = render(<PlatformLinkInput value={value} hint={hint} onChange={() => {}} aria-label="addr" />)
    const d = glyphOf(container)
    unmount()
    return d
  }

  it('the icon follows what is typed', () => {
    const github = paint('https://github.com/aya')
    const linkedin = paint('linkedin.com/in/aya')
    const site = paint('https://aya.tn')
    expect(github).not.toBe(linkedin)
    expect(site).not.toBe(github)
    expect(paint('')).toBe(site) // empty, no hint → the globe
  })

  it('a pre-set hint shows its glyph while empty, and typing takes over', () => {
    expect(paint('', 'github')).toBe(paint('https://github.com/x'))
    expect(paint('https://linkedin.com/in/x', 'github')).toBe(paint('https://linkedin.com/in/x'))
  })

  it('the address is LTR and typed through to onChange', () => {
    const onChange = vi.fn()
    render(<PlatformLinkInput value="" onChange={onChange} aria-label="addr" />)
    const input = screen.getByLabelText('addr') as HTMLInputElement
    expect(input.getAttribute('dir')).toBe('ltr')
    fireEvent.change(input, { target: { value: 'https://github.com/aya' } })
    expect(onChange).toHaveBeenCalledOnce()
  })
})

describe('RecommendedPlatforms', () => {
  it('one named button per platform, handing the id back', () => {
    const onPick = vi.fn()
    render(<RecommendedPlatforms platforms={['linkedin', 'github']} onPick={onPick} lang="fr" />)
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un lien GitHub' }))
    expect(onPick).toHaveBeenCalledWith('github')
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('renders nothing when everything is already added', () => {
    const { container } = render(<RecommendedPlatforms platforms={[]} onPick={() => {}} lang="fr" />)
    expect(container.innerHTML).toBe('')
  })
})

describe('linkRowsToPayload / takenPlatforms', () => {
  it('names each link after its platform, drops empty rows, and adds https:// to a bare address', () => {
    const payload = linkRowsToPayload([
      row('linkedin.com/in/aya'),
      row('  '),
      row('https://github.com/aya'),
      row('https://aya.tn'),
      row('https://soundcloud.com/aya'),
    ])
    expect(payload).toEqual([
      { label: 'LinkedIn', url: 'https://linkedin.com/in/aya' },
      { label: 'GitHub', url: 'https://github.com/aya' },
      { label: 'Site web', url: 'https://aya.tn' },
      { label: 'Site web', url: 'https://soundcloud.com/aya' },
    ])
  })

  it('a not-an-address row keeps its text (the http(s) check refuses it) and a hint names an unrecognised one', () => {
    expect(linkRowsToPayload([row('pas une adresse')])).toEqual([{ label: 'Site web', url: 'pas une adresse' }])
    expect(normalizeUrl('javascript:alert(1)')).toBe('javascript:alert(1)')
    expect(normalizeUrl('mailto:a@b.tn')).toBe('mailto:a@b.tn')
  })

  it('a pre-set hint never names an address that is not that platform', () => {
    expect(linkRowsToPayload([row('https://aya.tn', 'linkedin')])).toEqual([{ label: 'Site web', url: 'https://aya.tn' }])
    expect([...takenPlatforms([row('https://aya.tn', 'linkedin')])]).toEqual(['website'])
  })

  it('counts typed addresses by what they are and empty pre-set rows by their hint', () => {
    const taken = takenPlatforms([row('https://github.com/aya'), row('', 'linkedin'), row('https://aya.tn')])
    expect([...taken].sort()).toEqual(['github', 'linkedin', 'website'])
  })
})

describe('LinksEditor', () => {
  function Harness({ initial, recommended = ['linkedin', 'github', 'website'] as const }: { initial: LinkRow[]; recommended?: readonly (typeof PLATFORM_IDS)[number][] }) {
    const [rows, setRows] = React.useState(initial)
    return <LinksEditor rows={rows} onChange={setRows} recommended={recommended} lang="fr" />
  }

  it('shows the counter and the suggestions; picking one adds a pre-set row and removes the suggestion', () => {
    render(<Harness initial={[]} />)
    expect(screen.getByText('0/5')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un lien GitHub' }))
    expect(screen.getByText('1/5')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ajouter un lien GitHub' })).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Adresse du lien 1 (GitHub)' })).toBeTruthy()
  })

  it('a platform already saved is not suggested again', () => {
    render(<Harness initial={[row('https://www.linkedin.com/in/aya', null, 'a')]} />)
    expect(screen.queryByRole('button', { name: 'Ajouter un lien LinkedIn' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Ajouter un lien GitHub' })).toBeTruthy()
  })

  it('« Autre plateforme » adds a free row; removing a row frees its slot', () => {
    render(<Harness initial={[row('https://aya.tn', null, 'a')]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Autre plateforme' }))
    expect(screen.getByText('2/5')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le lien 1' }))
    expect(screen.getByText('1/5')).toBeTruthy()
  })

  it(`stops at ${LINKS_MAX}: no add buttons left, and there is no free label field`, () => {
    const full = Array.from({ length: LINKS_MAX }, (_, i) => row(`https://site${i}.tn`, null, `r${i}`))
    const { container } = render(<Harness initial={full} />)
    expect(screen.getByText(`${LINKS_MAX}/${LINKS_MAX}`)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Autre plateforme' })).toBeNull()
    expect(within(container).queryAllByRole('button', { name: /Ajouter un lien/ })).toHaveLength(0)
    expect(within(container).getAllByRole('textbox')).toHaveLength(LINKS_MAX) // one address per row, nothing else
  })

  it('adding a row moves focus to its address field; removing one keeps focus inside the editor', () => {
    render(<Harness initial={[row('https://aya.tn', null, 'a'), row('https://github.com/aya', null, 'b')]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Autre plateforme' }))
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /Adresse du lien 3/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le lien 1' }))
    expect(document.activeElement?.tagName).toBe('INPUT')
  })

  it('the count is a polite status', () => {
    render(<Harness initial={[]} />)
    expect(screen.getByRole('status').textContent).toBe('0/5')
  })
})
