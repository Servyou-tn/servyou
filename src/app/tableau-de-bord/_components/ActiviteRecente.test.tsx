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

import { ActiviteRecente } from './ActiviteRecente'
import type { ActivityEvent } from '@/lib/marche/freelancer-dashboard'

afterEach(cleanup)

const request: ActivityEvent = { kind: 'request', createdAt: '2026-10-30T10:00:00Z' } as ActivityEvent

describe('ActiviteRecente — no inert link', () => {
  it.each(['fr', 'ar'] as const)('%s: no « Voir tout » label, no link, nothing aria-disabled', (lang) => {
    render(<ActiviteRecente items={[request]} lang={lang} />)
    expect(screen.queryByText(/Voir tout|عرض الكل/)).toBeNull()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(document.querySelector('[aria-disabled="true"]')).toBeNull()
  })

  it('the empty state has no link either', () => {
    render(<ActiviteRecente items={[]} lang="fr" />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
