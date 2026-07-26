import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Search, Eye } from 'lucide-react'
import { Input } from './input'

const noop = () => {}

function Col({ children }: { children: React.ReactNode }) {
  // fixed 320px column so inputs render at a stable width at both 1440 and 380 (fits mobile).
  return <div className="flex w-80 flex-col gap-6">{children}</div>
}

const meta = { title: 'UI/Input', component: Input } satisfies Meta<typeof Input>
export default meta
type Story = StoryObj<typeof Input>

// Representative subset (see PR body): the state borders, the type coverage, the label/helper/error/
// required/counter affordances, and the icon slots. focus is a pseudo-state (not snapshotable);
// success renders a neutral border in Figma (a documented authoring gap), so it is not storied apart.
export const States: Story = {
  render: () => (
    <Col>
      <Input label="Par défaut" placeholder="Écrire…" />
      <Input label="Rempli" defaultValue="Sarra Mansouri" />
      <Input label="Erreur" defaultValue="sa" error="Nom trop court (2 caractères)." />
      <Input label="Désactivé" defaultValue="Non modifiable" disabled />
      <Input label="Lecture seule" defaultValue="Référence #A-2048" readOnly />
    </Col>
  ),
}

export const Types: Story = {
  render: () => (
    <Col>
      <Input label="Texte" type="text" placeholder="Nom complet" />
      <Input label="Email" type="email" placeholder="vous@exemple.tn" />
      <Input label="Téléphone" type="tel" iconStart={<span className="text-sm text-text-muted">+216</span>} placeholder="20 123 456" />
      <Input label="Mot de passe" type="password" defaultValue="motdepasse" iconEnd={<Eye className="text-text-muted" />} />
      <Input label="Nombre" type="number" placeholder="0" />
      <Input label="Recherche" type="search" iconStart={<Search className="text-text-muted" />} placeholder="Rechercher…" />
    </Col>
  ),
}

export const Affordances: Story = {
  render: () => (
    <Col>
      <Input label="Nom complet" required placeholder="Sarra Mansouri" helper="Tel qu'il apparaîtra sur votre profil." />
      <Input label="Bio" value="Développeuse front-end à Tunis." onChange={noop} maxLength={80} counter />
      <Input label="Email" defaultValue="pas-un-email" error="Adresse email invalide." />
    </Col>
  ),
}
