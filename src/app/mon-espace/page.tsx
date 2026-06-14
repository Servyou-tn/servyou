import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Manrope } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import { GreetingHeader } from '@/components/dashboard/consumer/GreetingHeader'
import {
  ActiveOrdersSnapshot,
  type OrderCardData,
} from '@/components/dashboard/consumer/ActiveOrdersSnapshot'
import { QuickActions } from '@/components/dashboard/consumer/QuickActions'

// Manrope display voice loaded once on this page's <main> via --font-display; the
// client sections reference it through the `display` class (same pattern as the auth
// funnel / landing sections). Body text inherits the global Inter.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mon espace — Servyou',
}

type OrderRow = {
  id: string
  order_type: string
  status: string
  created_at: string
  products: { title: string } | null
  service_listings: { title: string } | null
}

// The consumer's personal dashboard home. Server-rendered: one auth check, one
// profile read (for the greeting + role guard), one active-orders read.
export default async function MonEspacePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  // Profile (greeting + role guard) and active orders fetched in parallel — one
  // round-trip for the common consumer case. Active orders = everything not yet
  // terminal; two neq() clauses express "status NOT IN (received, cancelled)".
  // A seller's orders query is wasted work but they're redirected away below.
  const [
    { data: profile, error: profileError },
    { data: orders, error: ordersError },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, city, seller_type').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select('id, order_type, status, created_at, products(title), service_listings(title)')
      .eq('buyer_id', user.id)
      .neq('status', 'received')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
  ])
  if (profileError) console.error('[mon-espace] profile fetch error:', profileError)
  if (ordersError) console.error('[mon-espace] orders fetch error:', ordersError)

  // Consumer-only surface. Sellers are bounced to their own workspace dashboards.
  if (profile?.seller_type === 'shop_owner') redirect('/ma-boutique')
  if (profile?.seller_type === 'freelancer') redirect('/mon-profil-freelance')

  const rows = (orders as unknown as OrderRow[]) ?? []
  const cards: OrderCardData[] = rows.map((o) => ({
    id: o.id,
    title: (o.order_type === 'product' ? o.products?.title : o.service_listings?.title) ?? '—',
    status: o.status,
    order_type: o.order_type,
    dateLabel: new Date(o.created_at).toLocaleDateString('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  }))

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || null

  return (
    <main className={`${manrope.variable} mx-auto max-w-6xl px-6 py-10 md:py-14`}>
      <GreetingHeader firstName={firstName} />
      <ActiveOrdersSnapshot orders={cards} />
      <QuickActions showBecomeSeller={profile?.seller_type == null} />
    </main>
  )
}
