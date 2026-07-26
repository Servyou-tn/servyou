import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Plus, ArrowRight, Trash2 } from 'lucide-react'
import { Button, type ButtonVariant } from './button'

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger', 'link']

function Row({ children }: { children: React.ReactNode }) {
  // wrap so the row stays fully visible at 380 (mobile snapshot) instead of clipping.
  return <div className="flex flex-wrap items-center gap-4">{children}</div>
}

const meta = { title: 'UI/Button', component: Button } satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof Button>

// Representative subset (see PR body): every variant, every size, and the static states
// default / disabled / loading + icon composition. hover/pressed/focus are pseudo-states a static
// VRT snapshot can't trigger, so they are intentionally not storied.
export const Variants: Story = {
  render: () => <Row>{VARIANTS.map((v) => <Button key={v} variant={v}>Button</Button>)}</Row>,
}

export const Sizes: Story = {
  render: () => (
    <Row>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </Row>
  ),
}

export const Disabled: Story = {
  render: () => <Row>{VARIANTS.map((v) => <Button key={v} variant={v} disabled>Button</Button>)}</Row>,
}

export const Loading: Story = {
  render: () => <Row>{VARIANTS.map((v) => <Button key={v} variant={v} loading>Button</Button>)}</Row>,
}

export const Icons: Story = {
  render: () => (
    <Row>
      <Button iconStart={<Plus />}>Ajouter</Button>
      <Button variant="secondary" iconEnd={<ArrowRight />}>Suivant</Button>
      <Button variant="danger" aria-label="Supprimer" iconStart={<Trash2 />} />
    </Row>
  ),
}
