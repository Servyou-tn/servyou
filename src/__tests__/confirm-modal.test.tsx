/**
 * @vitest-environment jsdom
 *
 * Behavior-level tests for ConfirmModal's a11y wiring — the substance of PR-E's Close/Delete
 * unification (both flows now share this component instead of Close having none of it). Screenshots
 * of injected markup can only prove the styling; these assert the actual behavior: focus moves into
 * the dialog on open, Escape closes and restores focus to the opener, body scroll is locked while
 * open and released on close, and Tab/Shift+Tab cycle between Cancel and Confirm without ever
 * leaving the dialog.
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

describe('ConfirmModal — Tab trap', () => {
  it('wraps Tab forward from Confirm back to Cancel, never leaving the dialog', async () => {
    const user = userEvent.setup()
    const before = document.createElement('button')
    before.textContent = 'page content before the modal'
    document.body.insertBefore(before, document.body.firstChild)

    renderModal()
    const cancelBtn = screen.getByRole('button', { name: 'Annuler' })
    const confirmBtn = screen.getByRole('button', { name: 'Confirmer' })

    await user.tab() // dialog container -> Cancel (default browser behaviour, no interception needed)
    expect(cancelBtn).toHaveFocus()
    await user.tab() // Cancel -> Confirm
    expect(confirmBtn).toHaveFocus()
    await user.tab() // Confirm -> wraps back to Cancel, does NOT escape to `before`
    expect(cancelBtn).toHaveFocus()

    before.remove()
  })

  it('wraps Shift+Tab backward from Cancel to Confirm', async () => {
    const user = userEvent.setup()
    renderModal()
    const cancelBtn = screen.getByRole('button', { name: 'Annuler' })
    const confirmBtn = screen.getByRole('button', { name: 'Confirmer' })

    cancelBtn.focus()
    expect(cancelBtn).toHaveFocus()
    await user.tab({ shift: true }) // Cancel -> wraps to Confirm
    expect(confirmBtn).toHaveFocus()
  })
})
