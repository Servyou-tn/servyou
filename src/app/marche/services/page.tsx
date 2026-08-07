import { ServicesBrowsePage } from '@/components/marche/ServicesBrowsePage'

// Engine 2 — the services marketplace, rebuilt to the v3.7 Figma (611:45637). Public, no auth
// gate. The Freelances lens is a fast-follow (Scope A).
//
// The note that used to sit here said this was "forked off the shared MarcheBrowsePage, which still
// powers /marche/produits". Both halves are now false: MarcheBrowsePage was deleted in PR #83, and
// /marche/produits is its own engine as of C1 (569:39769). The fork is history, not structure.
export default function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ServicesBrowsePage searchParams={searchParams} />
}
