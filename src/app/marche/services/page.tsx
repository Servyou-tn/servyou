import { ServicesBrowsePage } from '@/components/marche/ServicesBrowsePage'

// Engine 2 — the services marketplace, rebuilt to the v3.7 Figma (611:45637). Forked off the
// shared MarcheBrowsePage (which still powers /marche/produits) so the two rebuild
// independently. Public, no auth gate. The Freelances lens is a fast-follow (Scope A).
export default function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ServicesBrowsePage searchParams={searchParams} />
}
