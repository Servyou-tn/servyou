import { ServicesBrowsePage } from '@/components/marche/ServicesBrowsePage'
import { FreelancesLens } from '@/components/marche/FreelancesLens'
import type { Metadata } from 'next'
import { publicMetadata } from '@/lib/seo/metadata'

// Search / share metadata (audit checklist 5). The canonical drops the filters and the freelances lens: one entry.
export async function generateMetadata(): Promise<Metadata> {
  return publicMetadata('seo.title.services', 'seo.desc.services', '/marche/services')
}

// Engine 2 — the services marketplace, rebuilt to the v3.7 Figma (611:45637). Public, no auth
// gate. `?vue=freelances` is the Freelances lens (662:53894): the same route, a different result set —
// the pattern /marche/produits uses for its Boutiques lens.
//
// The note that used to sit here said this was "forked off the shared MarcheBrowsePage, which still
// powers /marche/produits". Both halves are now false: MarcheBrowsePage was deleted in PR #83, and
// /marche/produits is its own engine as of C1. The fork is history, not structure.
export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const vue = Array.isArray(sp.vue) ? sp.vue[0] : sp.vue
  if (vue === 'freelances') return <FreelancesLens searchParams={Promise.resolve(sp)} />
  return <ServicesBrowsePage searchParams={Promise.resolve(sp)} />
}
