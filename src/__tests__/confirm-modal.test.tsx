/**
 * @vitest-environment jsdom
 *
 * Behavior-level tests for ConfirmModal's a11y wiring — the substance of PR-E's Close/Delete
 * unification (both flows now share this component instead of Close having none of it). Screenshots
 * of injected markup can only prove the styling; these assert the actual behavior: focus moves into
 * the dialog on open, Escape closes and restores focus to the opener, body scroll is locked while
 * open and released on close, and whether Tab is actually trapped inside the dialog.
 *
 * Run: npx vitest run src/__tests__/confirm-modal.test.tsx
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmModal } from '@/components/marche/ConfirmModal'

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

function renderModal(overrides: Partial<Parameters<typeof ConfirmModal>[0]> = {}) {
  const onCancel = () => {}
  const onConfirm = () => {}
  return render(
    <ConfirmModal
      titleId="t-title"
      title="Fermer cette annonce ?"
      body="L'annonce ne recevra plus de nouvelles réponses."
      cancelLabel="Annuler"
      confirmLabel="Confirmer"
      onCancel={onCancel}
      onConfirm={onConfirm}
      {...overrides}
    />,
  )
}

describe('ConfirmModal — focus on open', () => {
  it('moves focus into the dialog when it mounts', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(dialog)
  })

  it('restores focus to whatever was focused before it opened, on unmount', () => {
    const opener = document.createElement('button')
    opener.textContent = 'Fermer l’annonce'
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const { unmount } = renderModal()
    expect(document.activeElement).not.toBe(opener) // focus moved into the dialog

    unmount()
    expect(document.activeElement).toBe(opener)

    opener.remove()
  })
})

describe('ConfirmModal — Escape', () => {
  it('calls onCancel when Escape is pressed', async () => {
    const user = userEvent.setup()
    let cancelled = false
    renderModal({ onCancel: () => { cancelled = true } })
    await user.keyboard('{Escape}')
    expect(cancelled).toBe(true)
  })

  it('does NOT call onCancel on Escape while pending', async () => {
    const user = userEvent.setup()
    let cancelled = false
    renderModal({ onCancel: () => { cancelled = true }, pending: true })
    await user.keyboard('{Escape}')
    expect(cancelled).toBe(false)
  })
})

describe('ConfirmModal — scroll lock', () => {
  it('locks body scroll while mounted and releases it on unmount', () => {
    expect(document.body.style.overflow).toBe('')
    const { unmount } = renderModal()
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('ConfirmModal — Tab order', () => {
  // Documents the ACTUAL behavior, not the aspirational name. This is the same wiring the
  // pre-PR-E delete modal shipped (initial-focus + Escape + scroll-lock, no keydown handler
  // constraining Tab) — extracted into ConfirmModal unchanged, not a regression introduced here.
  // There is no focus trap: Tab is free to leave the dialog into the rest of the page. If a real
  // cycling trap is wanted, it does not exist today in either the old or the new code and would
  // be new work, not a preserved behavior.
  it('does NOT trap Tab inside the dialog — focus can leave to elements behind it', async () => {
    const user = userEvent.setup()
    const before = document.createElement('button')
    before.textContent = 'page content before the modal'
    document.body.insertBefore(before, document.body.firstChild)

    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(dialog)

    // Tab forward through: Cancel, Confirm, then (since nothing stops it) back out to the DOM's
    // next tabbable node — there is no sentinel/wrap-around handler to catch this.
    await user.tab() // -> Cancel
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus()
    await user.tab() // -> Confirm
    expect(screen.getByRole('button', { name: 'Confirmer' })).toHaveFocus()
    await user.tab() // -> nothing left inside the dialog subtree; escapes it
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Annuler' }))
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Confirmer' }))

    before.remove()
  })
})
