import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SettingRow, SETTING_ROW_LIST } from './setting-row'

// All four measured variants (COMPONENT_SET 181:12870), stacked in one list so the shared
// divide-y border between rows is visible too — see setting-row.tsx's header note on why each
// row carries no border of its own.
const meta = { title: 'UI/SettingRow', component: SettingRow } satisfies Meta<typeof SettingRow>
export default meta
type Story = StoryObj<typeof SettingRow>

function ToggleDemo() {
  const [on, setOn] = useState(true)
  return (
    <SettingRow
      variant="toggle"
      label="Nouvelles commandes reçues"
      description="Recevez un e-mail quand un client passe commande."
      checked={on}
      onCheckedChange={setOn}
    />
  )
}

function SelectDemo() {
  const [value, setValue] = useState('fr')
  return (
    <SettingRow
      variant="select"
      label="Langue"
      description="Français par défaut. L'arabe active la mise en page RTL sur toutes les pages."
      value={value}
      onChange={setValue}
      options={[
        { value: 'fr', label: 'Français' },
        { value: 'ar', label: 'العربية' },
      ]}
    />
  )
}

export const AllVariants: Story = {
  render: () => (
    <div className={SETTING_ROW_LIST + ' w-[600px] rounded-xl border border-border-subtle bg-white p-6'}>
      <ToggleDemo />
      <SettingRow
        variant="toggle-locked"
        label="Alertes de sécurité"
        description="Connexions inhabituelles et modifications de mot de passe. Toujours activé pour la sécurité de votre compte, ne peut être désactivé."
      />
      <SettingRow
        variant="link"
        label="Exporter mes données"
        description="Recevez par email une copie complète des données associées à votre compte Servyou."
        actionLabel="Demander l'export"
        onAction={() => {}}
      />
      <SelectDemo />
    </div>
  ),
}

export const Toggle: Story = { render: () => <ToggleDemo /> }

export const ToggleLocked: Story = {
  render: () => (
    <SettingRow
      variant="toggle-locked"
      label="Alertes de sécurité"
      description="Connexions inhabituelles et modifications de mot de passe. Toujours activé pour la sécurité de votre compte, ne peut être désactivé."
    />
  ),
}

export const Link: Story = {
  render: () => (
    <SettingRow
      variant="link"
      label="Exporter mes données"
      description="Recevez par email une copie complète des données associées à votre compte Servyou."
      actionLabel="Demander l'export"
      onAction={() => {}}
    />
  ),
}

export const Select: Story = { render: () => <SelectDemo /> }
