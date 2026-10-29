/**
 * @vitest-environment jsdom
 *
 * Paramètres shell × Notifications tab — mock-only (no database).
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { DEFAULT_NOTIF_PREFS } from '@/lib/notifications/prefs'
import type { CurrentProfile } from '@/lib/marche/mon-compte'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/app/mon-compte/actions', () => ({ updateProfileAction: vi.fn() }))
vi.mock('@/app/parametres/actions', () => ({ saveNotificationPrefsAction: vi.fn(), requestDataExportAction: vi.fn() }))

import { ParametresShell } from './ParametresShell'

afterEach(cleanup)

const profile = { id: 'u1', full_name: 'Test', email: 't@example.com', phone: null, city: null, language: 'fr' } as unknown as CurrentProfile

function shell(notifPrefs: typeof DEFAULT_NOTIF_PREFS | null) {
  return createElement(LangProvider, { lang: 'fr' }, createElement(ParametresShell, { profile, role: 'shop_owner', notifPrefs }))
}

describe('ParametresShell — Notifications tab', () => {
  it('shows the retry state, no toggles, when the stored preferences could not be read', () => {
    render(shell(null))
    expect(screen.getByRole('alert')).toHaveTextContent(t('parametres.notifications.load_error', 'fr'))
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
  })

  it('recovers when « Réessayer » (router.refresh) hands the shell real preferences — it stays mounted, so state must adopt the new prop', () => {
    const { rerender } = render(shell(null))
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
    rerender(shell(DEFAULT_NOTIF_PREFS))
    // shop_owner: 5 toggles + the locked security switch
    expect(screen.getAllByRole('switch')).toHaveLength(6)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a shop_owner sees the stock-alert row; defaults reflect the table (newsletter off)', () => {
    render(shell(DEFAULT_NOTIF_PREFS))
    expect(screen.getByRole('switch', { name: t('parametres.notifications.email_low_stock.label', 'fr') })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('switch', { name: t('parametres.notifications.email_new_orders.shop_owner.label', 'fr') })).toHaveAttribute('aria-checked', 'true')
  })
})
