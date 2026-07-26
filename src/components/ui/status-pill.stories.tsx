import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { StatusPill } from './status-pill'

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>
}

const meta = { title: 'UI/StatusPill', component: StatusPill } satisfies Meta<typeof StatusPill>
export default meta
type Story = StoryObj<typeof StatusPill>

// Representative subset (see PR body): one status per visual colour family, the three solid highlights,
// and all three role variants. The other ~25 statuses are colour-family duplicates (identical tokens,
// only the label text differs) and add no visual signal; no status is RTL-asymmetric (text-only,
// centred, symmetric padding). Labels are FR here (a caller passes i18n in the app).
export const Families: Story = {
  render: () => (
    <Row>
      <StatusPill status="active">Actif</StatusPill>
      <StatusPill status="pending">En attente</StatusPill>
      <StatusPill status="in-transit">En livraison</StatusPill>
      <StatusPill status="completed">Terminé</StatusPill>
      <StatusPill status="paused">Mis en pause</StatusPill>
      <StatusPill status="cancelled">Annulé</StatusPill>
    </Row>
  ),
}

export const Highlights: Story = {
  render: () => (
    <Row>
      <StatusPill status="new">Nouveau</StatusPill>
      <StatusPill status="sale">Solde</StatusPill>
      <StatusPill status="best-seller">Meilleure vente</StatusPill>
    </Row>
  ),
}

export const Roles: Story = {
  render: () => (
    <Row>
      <StatusPill status="freelance">Freelance</StatusPill>
      <StatusPill status="boutique">Boutique</StatusPill>
      <StatusPill status="client">Client</StatusPill>
    </Row>
  ),
}
