import { redirect } from 'next/navigation'

// Workspace root — Ruling 3 (docs/design/h4-discovery.md §7). Never had a page; every existing
// call site (roles.ts's roleWorkspacePath, ProfileAvatarMenu, ma-boutique/creer/page.tsx) already
// points here assuming it resolves. Bare redirect — no auth check here, /tableau-de-bord's own
// requireFreelancer guard handles auth + role.
export default function MonProfilFreelancePage() {
  redirect('/tableau-de-bord')
}
