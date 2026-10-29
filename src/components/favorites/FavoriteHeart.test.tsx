/**
 * @vitest-environment jsdom
 *
 * FavoriteHeart — optimistic flip, rollback on refusal, idempotent payload, guest redirect. Mock-only.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

const push = vi.fn()
const toastError = vi.fn()
const setFavoriteAction = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }))
vi.mock('@/app/actions/favorites', () => ({ setFavoriteAction: (...a: unknown[]) => setFavoriteAction(...a) }))

import { FavoriteHeart } from './FavoriteHeart'

const ID = '11111111-1111-4111-8111-111111111111'

function heart(props: Partial<React.ComponentProps<typeof FavoriteHeart>> = {}) {
  return (
    <LangProvider lang="fr">
      <FavoriteHeart kind="shop" targetId={ID} initialFavorited={false} isLoggedIn {...props} />
    </LangProvider>
  )
}

beforeEach(() => {
  push.mockClear()
  toastError.mockClear()
  setFavoriteAction.mockReset()
})
afterEach(cleanup)

describe('FavoriteHeart', () => {
  it('flips at once and asks the server for the state it wants (not a « toggle »)', async () => {
    setFavoriteAction.mockResolvedValue({ ok: true })
    render(heart())
    const btn = screen.getByRole('button', { name: t('favorites.add', 'fr') })
    expect(btn).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(btn)
    expect(screen.getByRole('button', { name: t('favorites.remove', 'fr') })).toHaveAttribute('aria-pressed', 'true')
    expect(setFavoriteAction).toHaveBeenCalledWith({ kind: 'shop', targetId: ID, favorited: true })
  })

  it('removes: an initially-favorited heart asks for favorited:false', async () => {
    setFavoriteAction.mockResolvedValue({ ok: true })
    render(heart({ initialFavorited: true, kind: 'freelancer' }))
    await userEvent.click(screen.getByRole('button', { name: t('favorites.remove', 'fr') }))
    expect(setFavoriteAction).toHaveBeenCalledWith({ kind: 'freelancer', targetId: ID, favorited: false })
    expect(screen.getByRole('button', { name: t('favorites.add', 'fr') })).toHaveAttribute('aria-pressed', 'false')
  })

  it('rolls back and tells the user when the server refuses; onChange sees both moves', async () => {
    setFavoriteAction.mockResolvedValue({ ok: false, error: 'Une erreur est survenue.' })
    const onChange = vi.fn()
    render(heart({ onChange }))
    await userEvent.click(screen.getByRole('button', { name: t('favorites.add', 'fr') }))

    await waitFor(() => expect(screen.getByRole('button', { name: t('favorites.add', 'fr') })).toHaveAttribute('aria-pressed', 'false'))
    expect(toastError).toHaveBeenCalledWith('Une erreur est survenue.')
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([true, false])
  })

  it('sends a GUEST to sign-in with the target’s page as ?next= — no write, no optimistic flip', async () => {
    render(heart({ isLoggedIn: false }))
    await userEvent.click(screen.getByRole('button', { name: t('favorites.add', 'fr') }))
    expect(push).toHaveBeenCalledWith(`/connexion?next=${encodeURIComponent(`/boutique/${ID}`)}`)
    expect(setFavoriteAction).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: t('favorites.add', 'fr') })).toHaveAttribute('aria-pressed', 'false')
  })
})
