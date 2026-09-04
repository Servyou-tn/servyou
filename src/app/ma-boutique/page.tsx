import { redirect } from 'next/navigation'

// Workspace root — Ruling 3 (docs/design/h4-discovery.md §7). Never had a page. Bare redirect —
// no auth check here, /tableau-de-bord-vendeur's own requireShopOwner guard handles auth + role.
export default function MaBoutiquePage() {
  redirect('/tableau-de-bord-vendeur')
}
