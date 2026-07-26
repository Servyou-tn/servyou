import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Avatar, type AvatarSize } from './avatar'

const SIZES: AvatarSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
// Deterministic inline image (solid brand-blue) so VRT baselines never depend on the network.
const IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%231F5FE0'/%3E%3C/svg%3E"

function Row({ children }: { children: React.ReactNode }) {
  // wrap so the fixed-size row stays fully visible at 380 (mobile snapshot) instead of clipping the 2xl.
  return <div className="flex flex-wrap items-end gap-4">{children}</div>
}

const meta = { title: 'UI/Avatar', component: Avatar } satisfies Meta<typeof Avatar>
export default meta
type Story = StoryObj<typeof Avatar>

// All 6 sizes × 3 types (image / fallback / initials). Online-dot + verified-badge intentionally off.
export const Image: Story = {
  render: () => <Row>{SIZES.map((s) => <Avatar key={s} size={s} src={IMG} name="Sarra Mansouri" />)}</Row>,
}
export const Fallback: Story = {
  render: () => <Row>{SIZES.map((s) => <Avatar key={s} size={s} name="Sarra Mansouri" />)}</Row>,
}
export const Initials: Story = {
  render: () => <Row>{SIZES.map((s) => <Avatar key={s} size={s} initials="SM" name="Sarra Mansouri" />)}</Row>,
}

// The account-chip case: the signed-in user's OWN initials in the header/top-bar menu trigger —
// md in the v2 shell (TopbarUserMenu), sm in the legacy header (AccountMenu). Decorative; the
// surrounding button carries the accessible name.
export const AccountChip: Story = {
  render: () => (
    <Row>
      <Avatar size="md" initials="MZ" />
      <Avatar size="sm" initials="MZ" />
    </Row>
  ),
}
