/**
 * @vitest-environment jsdom
 *
 * The show / hide eye on every password field (src/components/ui/password-reveal.tsx): PasswordInput (the design-system
 * Input, Mon compte's change-password modal) and the auth funnel's PasswordField (sign-in, sign-up, reset).
 *   • hidden by default; each field has its own toggle; the label switches; aria-controls → the input; no aria-pressed;
 *   • the field stays as the person set it; only concealPasswords(form) — called by a form that really sends — puts it
 *     back to hidden, already when the call returns (the real-form cases, sent vs blocked, are in NewPasswordForm.test);
 *   • the input keeps its name / id / autocomplete, and gets spellcheck / autocapitalize / autocorrect off.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'
import { PasswordInput } from './password-input'
import { concealPasswords } from './password-reveal'
import { PasswordField } from '@/components/auth/PasswordField'

afterEach(cleanup)

const SHOW = 'Afficher le mot de passe'
const HIDE = 'Masquer le mot de passe'

function renderInForm(fields: React.ReactNode) {
  return render(
    <LangProvider lang="fr">
      <form onSubmit={(e) => e.preventDefault()} noValidate>
        {fields}
        <button type="submit">Envoyer</button>
      </form>
    </LangProvider>,
  )
}

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement

describe('PasswordInput — the eye on the design-system Input', () => {
  it('starts hidden, with a real button that controls the input and a switching label (no aria-pressed)', () => {
    renderInForm(<PasswordInput label="Mot de passe actuel" name="current" autoComplete="current-password" />)
    const field = input('Mot de passe actuel')
    const eye = screen.getByRole('button', { name: SHOW })
    expect(field).toHaveAttribute('type', 'password')
    expect(eye).toHaveAttribute('type', 'button')
    expect(eye).toHaveAttribute('aria-controls', field.id)
    expect(eye).not.toHaveAttribute('aria-pressed')

    fireEvent.click(eye)
    expect(field).toHaveAttribute('type', 'text')
    expect(eye).toHaveAccessibleName(HIDE)
    fireEvent.click(eye)
    expect(field).toHaveAttribute('type', 'password')
    expect(eye).toHaveAccessibleName(SHOW)
  })

  it('keeps name, id and autocomplete, and turns spellcheck / autocapitalize / autocorrect off', () => {
    renderInForm(<PasswordInput id="pw-x" label="Nouveau" name="new" autoComplete="new-password" />)
    const field = input('Nouveau')
    expect(field).toHaveAttribute('id', 'pw-x')
    expect(field).toHaveAttribute('name', 'new')
    expect(field).toHaveAttribute('autocomplete', 'new-password')
    expect(field).toHaveAttribute('spellcheck', 'false')
    expect(field).toHaveAttribute('autocapitalize', 'off')
    expect(field).toHaveAttribute('autocorrect', 'off')
  })

  it('each field has its own toggle', () => {
    renderInForm(
      <>
        <PasswordInput label="Nouveau" />
        <PasswordInput label="Confirmer" />
      </>,
    )
    const [first, second] = screen.getAllByRole('button', { name: SHOW })
    fireEvent.click(first)
    expect(input('Nouveau')).toHaveAttribute('type', 'text')
    expect(input('Confirmer')).toHaveAttribute('type', 'password')
    expect(second).toHaveAccessibleName(SHOW)
  })
})

describe('back to hidden only when the form really sends (concealPasswords)', () => {
  it('concealPasswords hides a revealed field — already when the call returns', () => {
    renderInForm(<PasswordInput label="Mot de passe" />)
    const field = input('Mot de passe')
    fireEvent.click(screen.getByRole('button', { name: SHOW }))
    expect(field).toHaveAttribute('type', 'text')
    let typeOnReturn = ''
    act(() => {
      concealPasswords(field.form!)
      typeOnReturn = field.type // before React re-renders
    })
    expect(typeOnReturn).toBe('password')
    expect(field).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: SHOW })).toBeInTheDocument()
  })

  it('the eye itself never submits and never hides on its own click', () => {
    renderInForm(<PasswordInput label="Mot de passe" />)
    fireEvent.click(screen.getByRole('button', { name: SHOW }))
    expect(input('Mot de passe')).toHaveAttribute('type', 'text')
  })

  it('two forms reusing the same input id each bind to their own field', () => {
    render(
      <LangProvider lang="fr">
        <form aria-label="A" onSubmit={(e) => e.preventDefault()}>
          <PasswordInput id="password" label="Premier" />
        </form>
        <form aria-label="B" onSubmit={(e) => e.preventDefault()}>
          <PasswordInput id="password" label="Second" />
        </form>
      </LangProvider>,
    )
    // Duplicate ids break the labels' `for` (both point at the first input), so each form's input is read from the form.
    const first = screen.getByRole('form', { name: 'A' }).querySelector('input')!
    const second = screen.getByRole('form', { name: 'B' }).querySelector('input')!
    const [firstEye, secondEye] = screen.getAllByRole('button', { name: SHOW })
    fireEvent.click(secondEye)
    expect(second).toHaveAttribute('type', 'text')
    expect(first).toHaveAttribute('type', 'password')
    fireEvent.click(firstEye)
    act(() => concealPasswords(second.form!))
    expect(second).toHaveAttribute('type', 'password')
    expect(first).toHaveAttribute('type', 'text')
  })

  it('stops listening once the field is gone', () => {
    const { rerender } = renderInForm(<PasswordInput label="Mot de passe" />)
    const form = input('Mot de passe').form!
    rerender(
      <LangProvider lang="fr">
        <form onSubmit={(e) => e.preventDefault()} noValidate>
          <button type="submit">Envoyer</button>
        </form>
      </LangProvider>,
    )
    expect(() => concealPasswords(form)).not.toThrow()
  })
})

describe('a disabled field', () => {
  it('has a disabled eye: it cannot be revealed', () => {
    renderInForm(<PasswordInput label="Mot de passe" disabled />)
    const eye = screen.getByRole('button', { name: SHOW })
    expect(eye).toBeDisabled()
    fireEvent.click(eye)
    expect(input('Mot de passe')).toHaveAttribute('type', 'password')
  })
})

describe('PasswordField — the auth funnel field uses the same eye', () => {
  it('controls its input by id, no aria-pressed, hidden again by concealPasswords', () => {
    renderInForm(<PasswordField id="password" label="Mot de passe" value="" onChange={() => {}} autoComplete="current-password" />)
    const field = input('Mot de passe')
    const eye = screen.getByRole('button', { name: SHOW })
    expect(field).toHaveAttribute('id', 'password')
    expect(field).toHaveAttribute('autocomplete', 'current-password')
    expect(field).toHaveAttribute('spellcheck', 'false')
    expect(eye).toHaveAttribute('aria-controls', 'password')
    expect(eye).not.toHaveAttribute('aria-pressed')

    fireEvent.click(eye)
    expect(field).toHaveAttribute('type', 'text')
    expect(eye).toHaveAccessibleName(HIDE)
    act(() => concealPasswords(field.form!))
    expect(field).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: SHOW })).toBeInTheDocument()
  })
})
