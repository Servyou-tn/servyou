import { getLang } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { parseDisputeTab } from './_lib/disputes'
import { loadDisputesView } from './_lib/load'
import { DisputesView } from './_components/DisputesView'

// J7 « Litiges » — the queue with its first dispute selected (Figma NOV 4 — Admin). RLS grants the admin
// SELECT on disputes, orders, order_events and profiles; every decision goes through ./actions.ts.
export default async function DisputesQueuePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin('/admin/litiges')
  const sp = await searchParams
  const lang = await getLang()
  const supabase = await createClient()
  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request), the admin/statistiques precedent.
  const now = Date.now()
  const view = await loadDisputesView(supabase, lang, { tabParam: parseDisputeTab(sp.statut), selectedId: null, now })
  if ('notFound' in view) return null
  return <DisputesView lang={lang} {...view} />
}
