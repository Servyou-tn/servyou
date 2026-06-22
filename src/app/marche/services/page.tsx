import { MarcheBrowsePage } from '@/components/marche/MarcheBrowsePage'

// Engine 2 — the services marketplace (services + freelancers). Freelancers strip is a
// fast-follow (Scope A); today this is the services browse-by-default surface, with the
// scoped category filter in the sidebar. Public, no auth gate.
export default function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <MarcheBrowsePage type="service" searchParams={searchParams} />
}
