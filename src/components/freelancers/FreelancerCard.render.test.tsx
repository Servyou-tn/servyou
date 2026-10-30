/**
 * @vitest-environment jsdom
 *
 * The Freelancer Card as the Figma component draws it (662:53894): a person glyph (never initials) when there is no picture, up to 4 skills + « +N »
 * (2 + « +N » below `sm`), « N services offerts », « Voir le profil » to /freelance/<id>, and the heart only when it is wired.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { createElement } from 'react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }))
vi.mock('@/app/actions/favorites', () => ({ setFavoriteAction: async () => ({ ok: true }) }))
vi.mock('sonner', () => ({ toast: { error: () => {} } }))

import { LangProvider } from '@/components/LangProvider'
import { FreelancerCard } from './FreelancerCard'
import type { FreelancerCardData } from '@/lib/marche/freelancer-cards'

afterEach(cleanup)

const sk = (...names: string[]) => names.map((n) => ({ fr: n, ar: `${n}-ar` }))
const data = (over: Partial<FreelancerCardData> = {}): FreelancerCardData => ({
  id: 'abc',
  name: 'Yassine Ben Ali',
  headline: 'Développeur Full Stack | React & Next.js',
  city: 'Tunis',
  avatarUrl: null,
  skills: sk('React', 'Next.js', 'Node.js', 'TypeScript', 'GraphQL', 'Docker'),
  serviceCount: 8,
  ...over,
})
const mount = (f: FreelancerCardData, heart?: Parameters<typeof FreelancerCard>[0]['heart'], lang: 'fr' | 'ar' = 'fr') =>
  render(
    <LangProvider lang={lang}>
      <FreelancerCard freelancer={f} lang={lang} heart={heart} />
    </LangProvider>,
  )

describe('FreelancerCard', () => {
  it('shows name, title, city, the services count and « Voir le profil » linking to the public profile', () => {
    mount(data())
    expect(screen.getByRole('link', { name: 'Yassine Ben Ali' })).toHaveAttribute('href', '/freelance/abc')
    expect(screen.getByText('Développeur Full Stack | React & Next.js')).toBeInTheDocument()
    expect(screen.getByText('Tunis')).toBeInTheDocument()
    expect(screen.getByText('8 services offerts')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voir le profil' })).toHaveAttribute('href', '/freelance/abc')
  })

  it('NO initials: without a picture the person glyph stands in; with one, the picture', () => {
    const { container, rerender } = mount(data())
    expect(container.textContent).not.toMatch(/\bYA\b/)
    expect(container.querySelector('svg.lucide-user')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    rerender(
      <LangProvider lang="fr">
        <FreelancerCard freelancer={data({ avatarUrl: 'https://cdn.example/a.jpg' })} lang="fr" />
      </LangProvider>,
    )
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/a.jpg')
  })

  it('draws 4 skills + « +N » on a wide card, and 2 + « +N » on a narrow one (CSS-switched, both counts are real)', () => {
    const { container } = mount(data())
    const chips = Array.from(container.querySelectorAll('ul li'))
    const text = chips.map((c) => c.textContent)
    expect(text).toEqual(['React', 'Next.js', 'Node.js', 'TypeScript', '+2', '+4'])
    // wide: the first two + chips 3-4 + « +2 »; narrow: chips 3-4 and the wide « +2 » are hidden, « +4 » is shown
    expect(chips[2].className).toMatch(/max-sm:hidden/)
    expect(chips[3].className).toMatch(/max-sm:hidden/)
    expect(chips[4].className).toMatch(/max-sm:hidden/)
    expect(chips[5].className).toMatch(/sm:hidden/)
    expect(chips[5].className).not.toMatch(/max-sm:hidden/)
  })

  it('has no « +N » for 2 skills or fewer, and no chip row at all without skills', () => {
    const { container, rerender } = mount(data({ skills: sk('React', 'Node.js') }))
    expect(Array.from(container.querySelectorAll('ul li')).map((c) => c.textContent)).toEqual(['React', 'Node.js'])
    rerender(
      <LangProvider lang="fr">
        <FreelancerCard freelancer={data({ skills: [] })} lang="fr" />
      </LangProvider>,
    )
    expect(container.querySelector('ul')).toBeNull()
  })

  it('3 or 4 skills: all shown wide, « +1 » / « +2 » only narrow', () => {
    const { container } = mount(data({ skills: sk('A', 'B', 'C') }))
    const chips = Array.from(container.querySelectorAll('ul li'))
    expect(chips.map((c) => c.textContent)).toEqual(['A', 'B', 'C', '+1'])
    expect(chips[3].className).toMatch(/sm:hidden/)
  })

  it('the heart is a plain pressable icon, present only when wired', () => {
    const { rerender } = mount(data())
    expect(screen.queryByRole('button')).toBeNull()
    rerender(
      <LangProvider lang="fr">
        <FreelancerCard freelancer={data()} lang="fr" heart={{ initialFavorited: true, isLoggedIn: true }} />
      </LangProvider>,
    )
    const heart = screen.getByRole('button')
    expect(heart).toHaveAttribute('aria-pressed', 'true')
    expect(heart.querySelector('svg')).toBeInTheDocument()
    expect(heart.className).not.toMatch(/border-border-subtle/) // no circle
  })

  it('hides the services figure when it could not be counted, keeps the CTA', () => {
    mount(data({ serviceCount: null }))
    expect(screen.queryByText(/services? offerts?/)).toBeNull()
    expect(screen.getByRole('link', { name: 'Voir le profil' })).toBeInTheDocument()
  })

  it('reads in Arabic: the chips take the Arabic label', () => {
    mount(data({ skills: sk('React') }), undefined, 'ar')
    expect(document.body.textContent).not.toMatch(/freelancerCard\./)
    expect(screen.getByText('React-ar')).toBeInTheDocument()
  })
})
