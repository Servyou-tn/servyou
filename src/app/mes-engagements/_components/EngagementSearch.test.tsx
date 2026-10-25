/**
 * @vitest-environment jsdom
 *
 * H8 — EngagementSearch. The default landing is « À traiter » (pending only, no `statut` in the URL), so a
 * search typed there would miss every other engagement. Submitting widens it to « Tous »; a tab the freelancer
 * chose stays; the sort is kept; `page` is dropped; clearing the box removes `q`.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const h = vi.hoisted(() => ({ push: vi.fn(), params: new URLSearchParams() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push }),
  useSearchParams: () => h.params,
}))

import { EngagementSearch } from './EngagementSearch'

afterEach(() => {
  cleanup()
  h.push.mockClear()
  h.params = new URLSearchParams()
})

async function submit(q: string, current = '', typed = 'logo') {
  h.params = new URLSearchParams(current)
  const user = userEvent.setup()
  render(<EngagementSearch q={q} lang="fr" />)
  const input = screen.getByRole('searchbox')
  await user.clear(input)
  if (typed) await user.type(input, typed)
  await user.type(input, '{Enter}')
}

describe('EngagementSearch', () => {
  it('from the default tab, widens to « Tous » so the search can find anything', async () => {
    await submit('', '')
    expect(h.push).toHaveBeenCalledWith('/mes-engagements?q=logo&statut=all')
  })

  it('keeps a tab the freelancer chose', async () => {
    await submit('', 'statut=in_progress')
    expect(h.push).toHaveBeenCalledWith('/mes-engagements?statut=in_progress&q=logo')
  })

  it('keeps the sort and drops the page', async () => {
    await submit('', 'statut=all&tri=oldest&page=3')
    expect(h.push).toHaveBeenCalledWith('/mes-engagements?statut=all&tri=oldest&q=logo')
  })

  it('clearing the box removes q and does not touch the tab', async () => {
    await submit('logo', 'statut=all&q=logo', '')
    expect(h.push).toHaveBeenCalledWith('/mes-engagements?statut=all')
  })
})
