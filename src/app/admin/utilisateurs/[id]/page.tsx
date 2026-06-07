import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { SuspendForm } from './SuspendForm'
import { UnsuspendButton } from './UnsuspendButton'

type Props = { params: Promise<{ id: string }> }

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  date_of_birth: string | null
  city: string | null
  language: string | null
  seller_type: string | null
  is_admin: boolean
  created_at: string
  suspended_at: string | null
  suspended_reason: string | null
}

function roleKey(p: { is_admin: boolean; seller_type: string | null }): string {
  if (p.is_admin) return 'admin.users.role_admin'
  if (p.seller_type === 'shop_owner') return 'admin.users.role_shop_owner'
  if (p.seller_type === 'freelancer') return 'admin.users.role_freelancer'
  return 'admin.users.role_consumer'
}

function formatDate(value: string, lang: Lang): string {
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-gray-800">{value}</dd>
    </div>
  )
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()
  const tr = (key: string): string => t(key, lang)
  const supabase = await createClient()

  const { data: { user: me } } = await supabase.auth.getUser()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, date_of_birth, city, language, seller_type, is_admin, created_at, suspended_at, suspended_reason')
    .eq('id', id)
    .maybeSingle()

  if (error) console.error('[admin/utilisateurs/[id]] fetch error:', error)

  if (!profile) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-gray-700">{tr('admin.users.error_not_found')}</p>
        <Link href="/admin/utilisateurs" className="inline-block text-sm text-blue-600 hover:underline">
          {tr('admin.users.back_to_list')}
        </Link>
      </div>
    )
  }

  const u = profile as Profile
  const isSelf = me?.id === u.id

  // Activity: seller links + order/report counts. Counts use head:true (no rows
  // returned, just the count). Run concurrently. Order counts are accurate now that
  // migration 24 ("Admin reads all orders") grants the admin SELECT on all orders;
  // report counts rely on reports' pre-existing is_admin() SELECT policy.
  const [shopRes, freelancerRes, ordersBuyer, ordersSeller, reportsCreated, reportsAgainst] = await Promise.all([
    u.seller_type === 'shop_owner'
      ? supabase.from('shops').select('id').eq('owner_id', u.id).maybeSingle()
      : Promise.resolve({ data: null }),
    u.seller_type === 'freelancer'
      ? supabase.from('freelancer_profiles').select('id').eq('profile_id', u.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', u.id),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', u.id),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reporter_id', u.id),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('target_type', 'user').eq('target_id', u.id),
  ])

  const shopId = (shopRes.data as { id: string } | null)?.id ?? null
  const freelancerId = (freelancerRes.data as { id: string } | null)?.id ?? null

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/utilisateurs" className="inline-block text-sm text-blue-600 hover:underline">
        {tr('admin.users.back_to_list')}
      </Link>

      {u.suspended_at && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold uppercase tracking-wide text-red-700">{tr('admin.users.status_suspended')}</p>
          <p className="mt-1 text-sm text-red-800">
            <span className="font-medium">{tr('admin.users.field_suspended_at')}:</span> {formatDate(u.suspended_at, lang)}
          </p>
          <p className="mt-1 text-sm text-red-800">
            <span className="font-medium">{tr('admin.users.field_suspended_reason')}:</span> {u.suspended_reason}
          </p>
        </div>
      )}

      <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-bold text-gray-800">{u.full_name ?? '—'}</h1>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Field label={tr('admin.users.field_email')} value={u.email ?? '—'} />
          <Field label={tr('admin.users.field_phone')} value={u.phone ?? '—'} />
          <Field label={tr('admin.users.field_dob')} value={u.date_of_birth ? formatDate(u.date_of_birth, lang) : '—'} />
          <Field label={tr('admin.users.field_city')} value={u.city ?? '—'} />
          <Field label={tr('admin.users.field_language')} value={u.language ?? '—'} />
          <Field label={tr('admin.users.field_role')} value={tr(roleKey(u))} />
          <Field label={tr('admin.users.field_admin')} value={u.is_admin ? 'Oui' : 'Non'} />
          <Field label={tr('admin.users.field_created_at')} value={formatDate(u.created_at, lang)} />
        </dl>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{tr('admin.users.activity_section_title')}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label={tr('admin.users.activity_orders_as_buyer')} value={String(ordersBuyer.count ?? 0)} />
          <Field label={tr('admin.users.activity_orders_as_seller')} value={String(ordersSeller.count ?? 0)} />
          <Field label={tr('admin.users.activity_reports_created')} value={String(reportsCreated.count ?? 0)} />
          <Field label={tr('admin.users.activity_reports_against')} value={String(reportsAgainst.count ?? 0)} />
        </div>
        {(shopId || freelancerId) && (
          <div className="flex flex-wrap gap-4 pt-1 text-sm">
            {shopId && (
              <Link href={`/boutique/${shopId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {tr('admin.users.shop_link')}
              </Link>
            )}
            {freelancerId && (
              <Link href={`/freelance/${freelancerId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {tr('admin.users.freelancer_link')}
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {isSelf ? (
          <p className="text-sm text-gray-500">{tr('admin.users.self_action_blocked')}</p>
        ) : u.suspended_at ? (
          <UnsuspendButton targetUserId={u.id} />
        ) : (
          <SuspendForm targetUserId={u.id} />
        )}
      </div>
    </div>
  )
}
