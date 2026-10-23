/**
 * @vitest-environment jsdom
 *
 * ui/tag-input.tsx — the H6 type-ahead extension (founder ruling D5) must leave the two existing
 * free-text consumers (H2 CompetencesForm, /mes-annonces skills) exactly as they were, and give H6
 * a working combobox: pool listed on focus, filtered as you type, picked by keyboard or mouse,
 * stored as the pool VALUE (an id) but shown by its label, typed labels normalized to the id.
 */

import '@testing-library/jest-dom/vitest'
import * as React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { TagInput, type TagInputProps } from '@/components/ui/tag-input'

afterEach(cleanup)

function Harness(props: Partial<TagInputProps> & { initial?: string[] }) {
  const { initial = [], ...rest } = props
  const [value, setValue] = React.useState<string[]>(initial)
  return (
    <TagInput
      label="Compétences"
      max={5}
      value={value}
      onChange={setValue}
      getRemoveLabel={(tag) => `Retirer ${tag}`}
      helper="Aide"
      {...rest}
    />
  )
}

const POOL = [
  { value: 'react', label: 'React' },
  { value: 'next-js', label: 'Next.js' },
  { value: 'identite-de-marque', label: 'identité de marque' },
]

describe('TagInput without suggestions (existing consumers)', () => {
  it('stays a plain text input with its N/M counter and adds the trimmed text on Enter', () => {
    render(<Harness min={3} />)
    const input = screen.getByRole('textbox')
    expect(input).not.toHaveAttribute('role', 'combobox')
    expect(input).not.toHaveAttribute('maxlength')
    expect(input).not.toHaveAttribute('autocomplete')
    expect(screen.getByText('0/5')).toBeInTheDocument()

    fireEvent.change(input, { target: { value: '  Figma ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Figma')).toBeInTheDocument()
    expect(screen.getByText('1/5')).toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('commits the draft on blur and refuses a case-insensitive duplicate', () => {
    render(<Harness initial={['Figma']} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'figma' } })
    fireEvent.blur(input)
    expect(screen.getAllByText(/figma/i)).toHaveLength(1)
  })
})

describe('TagInput with suggestions (H6 Compétences)', () => {
  const normalize = (text: string) => POOL.find((p) => p.label.toLowerCase() === text.toLowerCase())?.value ?? text
  const getLabel = (v: string) => POOL.find((p) => p.value === v)?.label ?? v

  it('lists the pool on focus and filters it accent-insensitively as you type', () => {
    render(<Harness suggestions={POOL} getLabel={getLabel} normalize={normalize} showCount={false} />)
    const input = screen.getByRole('combobox')
    expect(screen.queryByText('0/5')).not.toBeInTheDocument()

    fireEvent.focus(input)
    expect(screen.getAllByRole('option')).toHaveLength(3)

    fireEvent.change(input, { target: { value: 'identite' } })
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['identité de marque'])
  })

  it('picks with ↓ + Enter: stores the value, shows the label, and drops it from the list', () => {
    render(<Harness suggestions={POOL} getLabel={getLabel} normalize={normalize} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-activedescendant')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByRole('list', { name: 'Compétences' })).toHaveTextContent('React')
    expect(screen.getByRole('button', { name: 'Retirer react' })).toBeInTheDocument()
    fireEvent.focus(input)
    expect(screen.getAllByRole('option').map((o) => o.textContent)).not.toContain('React')
  })

  it('picks with the mouse without committing the half-typed text first', () => {
    render(<Harness suggestions={POOL} getLabel={getLabel} normalize={normalize} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'nex' } })
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Next.js' }))
    const chips = screen.getByRole('list', { name: 'Compétences' })
    expect(chips).toHaveTextContent('Next.js')
    expect(chips).not.toHaveTextContent('nex ')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('normalizes a typed pool label to its value, so typing « react » can’t duplicate a picked React', () => {
    render(<Harness initial={['react']} suggestions={POOL} getLabel={getLabel} normalize={normalize} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'REACT' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('offers « add what I typed » for text matching no suggestion', () => {
    render(
      <Harness suggestions={POOL} getLabel={getLabel} normalize={normalize} getAddLabel={(text) => `Ajouter « ${text} »`} />,
    )
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Tricot' } })
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Ajouter « Tricot »' }))
    expect(screen.getByRole('list', { name: 'Compétences' })).toHaveTextContent('Tricot')
  })

  it('caps one typed tag at maxLength and turns off browser autofill in combobox mode', () => {
    render(<Harness suggestions={POOL} maxLength={50} />)
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('maxlength', '50')
    expect(input).toHaveAttribute('autocomplete', 'off')
  })

  it('closes the list on Escape', () => {
    render(<Harness suggestions={POOL} />)
    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })
})
