/**
 * @vitest-environment jsdom
 *
 * FavoriteButton: the `icon` variant takes its size / colour from the caller, and when the item is favourited the heart is danger/500 ONLY — never two
 * text-* colours at once (the stylesheet order would pick the winner). The default glyph variant is unchanged.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))

const state = { user: null as { id: string } | null, favorite: null as { id: string } | null }
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq']) chain[m] = () => chain
    chain.maybeSingle = async () => ({ data: state.favorite })
    return { auth: { getUser: async () => ({ data: { user: state.user } }) }, from: () => chain }
  },
}))

import { LangProvider } from '@/components/LangProvider'
import { FavoriteButton } from './FavoriteButton'

afterEach(() => {
  cleanup()
  state.user = null
  state.favorite = null
})

const mount = (props: Partial<Parameters<typeof FavoriteButton>[0]> = {}) =>
  render(
    <LangProvider lang="fr">
      <FavoriteButton item_type="service" item_id="s1" {...props} />
    </LangProvider>,
  )

describe('FavoriteButton icon variant', () => {
  it("not favourited: the caller's size and colour, and nothing else", async () => {
    mount({ variant: 'icon', iconClassName: 'size-[18px] text-brand-blue-300' })
    const heart = await screen.findByRole('button', { name: /favoris/i })
    expect(heart.querySelector('svg')!.getAttribute('class')).toBe('lucide lucide-heart size-[18px] text-brand-blue-300')
  })

  it("favourited: danger/500 fill and stroke, the caller's size, and NO second text-* colour", async () => {
    state.user = { id: 'u1' }
    state.favorite = { id: 'f1' }
    mount({ variant: 'icon', iconClassName: 'size-[18px] text-brand-blue-300' })
    const heart = await screen.findByRole('button', { name: /Retirer/i })
    const cls = heart.querySelector('svg')!.getAttribute('class')!.split(/\s+/)
    expect(cls).toContain('fill-danger-500')
    expect(cls).toContain('text-danger-500')
    expect(cls).toContain('size-[18px]')
    expect(cls.filter((c) => c.startsWith('text-'))).toEqual(['text-danger-500'])
  })

  it('the default icon heart (the Service Card\'s) is 20 and muted, and red alone when favourited', async () => {
    state.user = { id: 'u1' }
    state.favorite = { id: 'f1' }
    mount({ variant: 'icon' })
    const cls = (await screen.findByRole('button', { name: /Retirer/i })).querySelector('svg')!.getAttribute('class')!.split(/\s+/)
    expect(cls).toContain('size-5')
    expect(cls.filter((c) => c.startsWith('text-'))).toEqual(['text-danger-500'])
  })

  it('the default glyph variant is unchanged: the text heart', async () => {
    const { container } = mount()
    await screen.findByRole('button', { name: /favoris/i })
    expect(container.textContent).toMatch(/♡/)
  })
})
