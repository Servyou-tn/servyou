/**
 * @vitest-environment jsdom
 *
 * ui/input.tsx — the additive `suffix` prop (H6 step 3 « Prix de départ », founder ruling D18):
 *   • set: a flush trailing segment after the input, and the field drops its end padding;
 *   • not set: the field markup is exactly what the 19 existing consumers already render.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Input } from '@/components/ui/input'

afterEach(cleanup)

const field = (input: HTMLElement) => input.parentElement as HTMLElement

describe('Input suffix', () => {
  it('renders the suffix after the input, inside the field, with the start border', () => {
    render(<Input label="Prix de départ" suffix="TND" />)
    const input = screen.getByLabelText('Prix de départ')
    const suffix = screen.getByText('TND')
    expect(field(input)).toContainElement(suffix)
    expect(input.nextElementSibling).toBe(suffix)
    expect(suffix).toHaveClass('border-s', 'border-border-subtle', 'bg-surface-sunken', 'self-stretch')
    expect(field(input)).toHaveClass('overflow-hidden', 'pe-0', 'px-4')
  })

  it('announces the suffix with the field, after the helper', () => {
    render(<Input label="Prix de départ" helper="Le prix de départ." suffix="TND" />)
    const input = screen.getByLabelText('Prix de départ')
    const ids = (input.getAttribute('aria-describedby') ?? '').split(' ')
    expect(ids).toHaveLength(2)
    expect(document.getElementById(ids[0])).toHaveTextContent('Le prix de départ.')
    expect(document.getElementById(ids[1])).toHaveTextContent('TND')
  })

  it('leaves the field unchanged when no suffix is given', () => {
    render(<Input label="Titre" helper="Aide" />)
    const input = screen.getByLabelText('Titre')
    expect(input.getAttribute('aria-describedby')?.split(' ')).toHaveLength(1)
    expect(field(input).children).toHaveLength(1)
    expect(field(input)).not.toHaveClass('overflow-hidden')
    expect(field(input)).not.toHaveClass('pe-0')
  })
})
