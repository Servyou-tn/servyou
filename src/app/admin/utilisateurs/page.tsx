import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'

// NOTE: reads the RAW profiles table (not public_profiles) — the admin needs email
// and the suspended state, which public_profiles strips. This is allowed only by the
// admin-gated "Admin reads all profiles" SELECT policy added in migration 23.
type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  seller_type: string | null
  is_admin: boolean
  city: string | null
  created_at: string
  suspended_at: string | null
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

function StatusBadge({ suspended, tr }: { suspended: boolean; tr: (k: string) => string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
      suspended ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
    }`}>
      {tr(suspended ? 'admin.users.status_suspended' : 'admin.users.status_active')}
    </span>
  )
}

export default async function UsersListPage() {
  const lang = await getLang()
  const tr = (key: string): string => t(key, lang)
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, seller_type, is_admin, city, created_at, suspended_at')
    .order('created_at', { ascending: false })

  if (error) console.error('[admin/utilisateurs] list fetch error:', error)
  const rows = (profiles as ProfileRow[] | null) ?? []

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">{tr('admin.users.title')}</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">{tr('admin.users.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.users.field_name')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.users.field_email')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.users.field_role')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.users.field_city')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.users.field_status')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.users.field_created_at')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/utilisateurs/${u.id}`} className="font-medium text-brand-blue-600 hover:underline">
                      {u.full_name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{u.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{tr(roleKey(u))}</td>
                  <td className="px-4 py-3 text-gray-700">{u.city ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge suspended={!!u.suspended_at} tr={tr} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(u.created_at, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
