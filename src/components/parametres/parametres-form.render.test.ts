import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import type { CurrentProfile } from '@/lib/marche/mon-compte'

// ParametresForm uses next/link; the server actions it imports are never called at render.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

const { ParametresForm } = await import('./ParametresForm')

const profile = {
  full_name: 'Test User',
  email: 'u@servyou.tn',
  phone: null,
  city: 'Tunis',
  language: 'fr',
} as unknown as CurrentProfile

function html(): string {
  return renderToString(createElement(LangProvider, { lang: 'fr', children: createElement(ParametresForm, { profile }) }))
}

describe('ParametresForm', () => {
  it('renders the four settings sections in order', () => {
    const out = html()
    expect(out).toContain('Langue') // §1 Préférences
    expect(out).toContain('Notifications') // §2
    expect(out).toContain('Confidentialité et données') // §3
    expect(out).toContain('Comptes connectés') // §4
    // language control present
    expect(out).toContain('Français')
    expect(out).toContain('العربية')
  })

  it('shows orders as always-on (read-only), links to the policy + deletion, and drops the visibility toggle', () => {
    const out = html()
    expect(out).toContain('Activées') // orders always-on badge (no toggle)
    expect(out).toContain('href="/confidentialite"') // read the full policy
    expect(out).toContain('href="/mon-compte"') // account deletion lives there
    expect(out).toContain('Exporter mes données') // export still present
    expect(out).not.toContain('Visibilité') // the visibility toggle was removed
  })
})
