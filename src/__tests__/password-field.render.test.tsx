import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import { PasswordField } from '@/components/auth/PasswordField'

// Render smoke (no interaction lib in the project) — confirms PasswordField renders
// the label, a password input + show toggle, the helper/error swap, and the
// strength meter only when asked. The show/hide click is a plain useState toggle,
// verified in the manual pass.
function render(props: Parameters<typeof PasswordField>[0]): string {
  return renderToString(<LangProvider lang="fr">{createElement(PasswordField, props)}</LangProvider>)
}

const noop = () => {}

describe('PasswordField render', () => {
  it('renders the label, a password input, and the show toggle', () => {
    const out = render({ id: 'pw', label: 'Mot de passe', value: '', onChange: noop })
    expect(out).toContain('Mot de passe')
    expect(out).toContain('type="password"')
    expect(out).toContain('aria-label="Afficher le mot de passe"')
  })

  it('renders helper text when provided and there is no error', () => {
    const out = render({ id: 'pw', label: 'X', value: '', onChange: noop, helperText: 'Min 8 caractères' })
    expect(out).toContain('Min 8 caractères')
  })

  it('shows the error and hides the helper when an error is present', () => {
    const out = render({ id: 'pw', label: 'X', value: '', onChange: noop, helperText: 'Min 8 caractères', error: 'Trop court' })
    expect(out).toContain('Trop court')
    expect(out).not.toContain('Min 8 caractères')
  })

  it('shows the strength meter (medium) when enabled with a medium-strength value', () => {
    const out = render({ id: 'pw', label: 'X', value: 'abcd1234', onChange: noop, showStrengthMeter: true })
    expect(out).toContain('Moyen')
  })

  it('omits the strength meter when showStrengthMeter is false', () => {
    const out = render({ id: 'pw', label: 'X', value: 'abcd1234', onChange: noop, showStrengthMeter: false })
    expect(out).not.toContain('Moyen')
  })
})
