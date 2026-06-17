import { redirect } from 'next/navigation'
import { marcheRedirectTarget } from '@/lib/marche/marche-routing'

// /marche split into two browse engines (/marche/produits, /marche/services). This entry
// point now redirects to the right engine, carrying any legacy refinement params over so
// old shareable links still resolve. Default is the Produits engine.
export default async function MarchePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  redirect(marcheRedirectTarget(await searchParams))
}
