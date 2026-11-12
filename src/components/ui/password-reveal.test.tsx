/**
 * @vitest-environment jsdom
 *
 * The show / hide eye on every password field (src/components/ui/password-reveal.tsx): PasswordInput (the design-system
 * Input, Mon compte's change-password modal) and the auth funnel's PasswordField (sign-in, sign-up, reset).
 *   • hidden by default; each field has its own toggle; the label switches; aria-controls → the input; no aria-pressed;
 *   • the field is back to type="password" DURING the event that starts a submission (Enter, a click on submit, submit),
 *     not only after React re-renders — so the browser never records the password as a text value;
 *   • the input keeps its name / id / autocomplete, and gets spellcheck / autocapitalize / autocorrect off.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'
import { PasswordInput } from './password-input'
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

describe('back to hidden when the form submits — already during the event', () => {
  // A listener added AFTER the field mounted runs after the hook's capture listener: what it sees is what the browser
  // sees at that moment.
  function typeDuring(eventName: 'submit' | 'click' | 'keydown', trigger: (field: HTMLInputElement) => void) {
    renderInForm(<PasswordInput label="Mot de passe" />)
    const field = input('Mot de passe')
    fireEvent.click(screen.getByRole('button', { name: SHOW }))
    expect(field).toHaveAttribute('type', 'text')
    let seen = ''
    field.form!.addEventListener(eventName, () => {
      seen = field.type
    })
    trigger(field)
    return { seen, field }
  }

  it('on the submit event', () => {
    const { seen, field } = typeDuring('submit', (f) => fireEvent.submit(f.form!))
    expect(seen).toBe('password')
    expect(field).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: SHOW })).toBeInTheDocument()
  })

  it('on a click on the submit button (before the browser starts the submission)', () => {
    const { seen } = typeDuring('click', () => fireEvent.click(screen.getByRole('button', { name: 'Envoyer' })))
    expect(seen).toBe('password')
  })

  it('on Enter in a field (implicit submission)', () => {
    const { seen } = typeDuring('keydown', (f) => fireEvent.keyDown(f, { key: 'Enter' }))
    expect(seen).toBe('password')
  })

  it('the eye itself never submits and never hides on its own click', () => {
    renderInForm(<PasswordInput label="Mot de passe" />)
    fireEvent.click(screen.getByRole('button', { name: SHOW }))
    expect(input('Mot de passe')).toHaveAttribute('type', 'text')
  })
})

describe('PasswordField — the auth funnel field uses the same eye', () => {
  it('controls its input by id, no aria-pressed, hidden again on submit', () => {
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
    fireEvent.submit(field.form!)
    expect(field).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: SHOW })).toBeInTheDocument()
  })
})
