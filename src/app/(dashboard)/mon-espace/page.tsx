import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Manrope } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import { getDashboardUser, getDashboardProfile } from '@/lib/dashboard/data'
import { GreetingHeader } from '@/components/dashboard/consumer/GreetingHeader'
import {
  ActiveOrdersSnapshot,
  type OrderCardData,
} from '@/components/dashboard/consumer/ActiveOrdersSnapshot'
import { QuickActions } from '@/components/dashboard/consumer/QuickActions'

// Manrope display voice for the center-column sections (greeting/orders/actions).
// Set on this page's root so its sections inherit --font-display via the `display`
// class; body text stays the global Inter.
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

// The dashboard shell (layout) owns auth + role guards, the chrome, and the right
// rail. This page only fetches and renders the center column. Profile reads are
// deduped with the layout via React cache().
export default async function MonEspacePage() {
  const user = await getDashboardUser()
  if (!user) redirect('/connexion')
  const profile = await getDashboardProfile(user.id)

  const supabase = await createClient()
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, order_type, status, created_at, products(title), service_listings(title)')
    .eq('buyer_id', user.id)
    .neq('status', 'received')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
  if (ordersError) console.error('[mon-espace] orders fetch error:', ordersError)

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
    <div className={`${manrope.variable} mx-auto max-w-2xl`}>
      <GreetingHeader firstName={firstName} />
      <ActiveOrdersSnapshot orders={cards} />
      <QuickActions showBecomeSeller={profile?.seller_type == null} />
    </div>
  )
}
