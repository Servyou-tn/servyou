import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'

// ErrorState is a server component with one client leaf (RetryButton → router.refresh).
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

import { ErrorState } from '@/components/marche/ErrorState'

describe('ErrorState', () => {
  it('renders an alert with the FR title, body and a « Réessayer » button', () => {
    const out = renderToString(createElement(ErrorState, { lang: 'fr' }))
    expect(out).toContain('role="alert"')
    expect(out).toContain('Impossible de charger ce contenu')
    expect(out).toContain('Réessayez dans un instant')
    expect(out).toContain('Réessayer')
    expect(out).toContain('<button')
  })

  it('renders the AR copy with no French leaking', () => {
    const out = renderToString(createElement(ErrorState, { lang: 'ar' }))
    expect(out).toContain('تعذر تحميل المحتوى')
    expect(out).toContain('إعادة المحاولة')
    expect(out).not.toContain('Impossible')
    expect(out).not.toContain('Réessayer')
  })

  it('uses logical properties only (RTL-safe)', () => {
    const out = renderToString(createElement(ErrorState, { lang: 'fr' }))
    expect(out).not.toMatch(/\b(pl|pr|ml|mr)-\d|text-left|text-right/)
  })
})
