import { MarcheBrowsePage } from '@/components/marche/MarcheBrowsePage'

// Engine 1 — the products marketplace (products + boutiques). Boutiques strip is a
// fast-follow (Scope A); today this is the products browse-by-default surface, with the
// scoped category filter in the sidebar. Public, no auth gate.
export default function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <MarcheBrowsePage type="product" searchParams={searchParams} />
}
