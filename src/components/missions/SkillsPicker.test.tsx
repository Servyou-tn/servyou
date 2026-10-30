/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SkillsPicker, type SkillSection } from './SkillsPicker'

beforeAll(() => {
  // Radix Popover measures its trigger.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
afterEach(cleanup)

const SECTIONS: SkillSection[] = [
  { id: 'required', label: 'Demandées', options: ['React', 'Rédaction'] },
  { id: 'others', label: 'Autres', options: ['Figma', 'Node'] },
]

function Harness({
  initial = [],
  custom,
  max,
  sections = SECTIONS,
  onValue,
}: {
  initial?: string[]
  custom?: boolean
  max?: number
  sections?: SkillSection[]
  onValue?: (v: string[]) => void
}) {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <SkillsPicker
      sections={sections}
      value={value}
      onChange={(v) => {
        setValue(v)
        onValue?.(v)
      }}
      max={max}
      label="Compétences"
      placeholder="Choisir"
      selectedLabel={(n) => `${n} sélectionnée(s)`}
      removeLabel={(s) => `Retirer ${s}`}
      searchPlaceholder="Rechercher"
      emptyLabel="Rien"
      custom={custom ? { addLabel: (t) => `Ajouter « ${t} »`, maxLength: 60 } : undefined}
    />
  )
}

async function open() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Choisir|sélectionnée/ }))
  return user
}

describe('SkillsPicker', () => {
  it('shows the placeholder with nothing selected and the count with some', () => {
    const first = render(<Harness />)
    expect(screen.getByRole('button', { name: /Choisir/ })).toBeInTheDocument()
    first.unmount()
    render(<Harness initial={['React']} />)
    expect(screen.getByRole('button', { name: /1 sélectionnée/ })).toBeInTheDocument()
  })

  it('lists the sections and selects / deselects as SEPARATE skills, with a removable chip each', async () => {
    const seen: string[][] = []
    render(<Harness onValue={(v) => seen.push(v)} />)
    const user = await open()
    expect(screen.getByRole('group', { name: 'Demandées' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Autres' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'React' }))
    await user.click(screen.getByRole('checkbox', { name: 'Figma' }))
    expect(seen.at(-1)).toEqual(['React', 'Figma'])
    expect(screen.getByRole('button', { name: 'Retirer React' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retirer React' }))
    expect(seen.at(-1)).toEqual(['Figma'])
  })

  it('search filters accent- and case-insensitively', async () => {
    render(<Harness />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'REDACTION')
    expect(screen.getByRole('checkbox', { name: 'Rédaction' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'React' })).not.toBeInTheDocument()
  })

  it('a closed pool offers NO free-text add (H12: skills ⊆ the pool)', async () => {
    render(<Harness />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'Cobol')
    expect(screen.queryByText(/Ajouter/)).not.toBeInTheDocument()
    expect(screen.getByText('Rien')).toBeInTheDocument()
  })

  it('custom mode: a typed text that matches nothing is added as ONE trimmed skill — a sentence stays one skill the user chose, never split', async () => {
    const seen: string[][] = []
    render(<Harness custom sections={[]} onValue={(v) => seen.push(v)} />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), '  Motion design ')
    await user.click(screen.getByRole('button', { name: /Ajouter « Motion design »/ }))
    expect(seen.at(-1)).toEqual(['Motion design'])
  })

  it('custom mode: commas / semicolons separate skills, a part that is in the pool uses the POOL spelling, nothing is dropped silently', async () => {
    const seen: string[][] = []
    render(<Harness custom onValue={(v) => seen.push(v)} />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'figma, Cobol; node')
    await user.click(screen.getByRole('button', { name: /Ajouter « Figma, Cobol, Node »/ }))
    expect(seen.at(-1)).toEqual(['Figma', 'Cobol', 'Node'])
  })

  it('custom mode: the ARABIC comma and semicolon separate skills too (an Arabic keyboard types « ، » not « , »)', async () => {
    const seen: string[][] = []
    render(<Harness custom sections={[]} onValue={(v) => seen.push(v)} />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'تصميم، تسويق؛ محاسبة')
    await user.click(screen.getByRole('button', { name: /Ajouter/ }))
    expect(seen.at(-1)).toEqual(['تصميم', 'تسويق', 'محاسبة'])
  })

  it('custom mode: text typed but never confirmed with Enter becomes tags when the popover closes (a submit must not lose it)', async () => {
    const seen: string[][] = []
    render(<Harness custom sections={[]} onValue={(v) => seen.push(v)} />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), ' Cobol, node ')
    await user.click(document.body) // outside click, like a click on a form's submit button
    expect(seen.at(-1)).toEqual(['Cobol', 'node'])
  })

  it('custom mode: Escape CANCELS — typed text is dropped, not committed', async () => {
    const seen: string[][] = []
    render(<Harness custom sections={[]} onValue={(v) => seen.push(v)} />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'Cobol')
    await user.keyboard('{Escape}')
    expect(seen).toEqual([])
  })

  it('custom mode: text that still matches a pool option was a FILTER, not a new skill (« fig » + tick « Figma » leaves only Figma)', async () => {
    const seen: string[][] = []
    render(<Harness custom onValue={(v) => seen.push(v)} />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'fig')
    await user.click(screen.getByRole('checkbox', { name: 'Figma' }))
    await user.click(document.body)
    expect(seen.at(-1)).toEqual(['Figma'])
  })

  it('custom mode: closing with typed text never goes past `max`', async () => {
    const seen: string[][] = []
    render(<Harness custom sections={[]} max={2} onValue={(v) => seen.push(v)} />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'a, b, c')
    await user.click(document.body)
    expect(seen.at(-1)).toEqual(['a', 'b'])
  })

  it('a closed pool (no custom entry) commits nothing when it closes with typed text', async () => {
    const seen: string[][] = []
    render(<Harness onValue={(v) => seen.push(v)} />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'zzz')
    await user.click(document.body)
    expect(seen).toEqual([])
  })

  it('custom mode: typing exactly a pool option offers no add row (the option itself is listed)', async () => {
    render(<Harness custom />)
    const user = await open()
    await user.type(screen.getByRole('searchbox', { name: 'Rechercher' }), 'react')
    expect(screen.queryByText(/Ajouter/)).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'React' })).toBeInTheDocument()
  })

  it('custom mode does not offer to add something already in the pool or already selected (accent/case-insensitive)', async () => {
    render(<Harness custom initial={['Rédaction']} />)
    const user = await open()
    const box = screen.getByRole('searchbox', { name: 'Rechercher' })
    await user.type(box, 'figma')
    expect(screen.queryByText(/Ajouter/)).not.toBeInTheDocument()
    await user.clear(box)
    await user.type(box, 'redaction')
    expect(screen.queryByText(/Ajouter/)).not.toBeInTheDocument()
  })

  it('stops at `max`: the unchecked options are inert, the checked ones can still be removed', async () => {
    const seen: string[][] = []
    render(<Harness max={1} initial={['React']} onValue={(v) => seen.push(v)} />)
    const user = await open()
    await user.click(screen.getByRole('checkbox', { name: 'Figma' }))
    expect(seen).toEqual([])
    await user.click(screen.getByRole('checkbox', { name: 'React' }))
    expect(seen.at(-1)).toEqual([])
  })

  it('never lets two spellings of one skill in', async () => {
    render(<Harness initial={['react']} />)
    const user = await open()
    expect(within(screen.getByRole('group', { name: 'Demandées' })).getByRole('checkbox', { name: 'React' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'React' }))
    expect(screen.queryByRole('button', { name: /Retirer/ })).not.toBeInTheDocument()
  })
})
