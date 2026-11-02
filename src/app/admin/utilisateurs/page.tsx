import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { reportQueryError } from '@/lib/supabase/query-error'
import { ErrorState } from '@/components/marche/ErrorState'
import { ACCOUNT_ROLES, accountRoleI18nKey, accountRoles, parseAccountRole, type AccountRole } from '@/lib/roles'

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

type ShopRow = { id: string; name: string; owner_id: string }

const ROLE_BADGE: Record<AccountRole, string> = {
  admin: 'bg-brand-blue-50 text-brand-blue-700',
  shop_owner: 'bg-amber-50 text-amber-700',
  freelancer: 'bg-brand-indigo-100 text-brand-indigo-600', // not green: that is the « Actif » status badge
  consumer: 'bg-gray-100 text-gray-700',
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

// Every role an account holds is a badge (an admin who owns a shop shows « Administrateur » AND « Boutique »), the
// shop name links to its public page, and ?role= filters the list (lib/roles.ts accountRoles / parseAccountRole).
export default async function UsersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin('/admin/utilisateurs')
  const lang = await getLang()
  const tr = (key: string): string => t(key, lang)
  const supabase = await createClient()
  const roleFilter = parseAccountRole((await searchParams).role)

  // Shops are read on their own (not embedded): admins read every shop, hidden or not, through the shops SELECT
  // policy's is_admin() branch; the columns named here are in the shops column-level SELECT grant.
  const [{ data: profiles, error }, { data: shops, error: shopsError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, seller_type, is_admin, city, created_at, suspended_at')
      .order('created_at', { ascending: false }),
    supabase.from('shops').select('id, name, owner_id'),
  ])

  // A failed read is an error state, never the « no users » empty list or a silently missing shop.
  if (error) reportQueryError('admin/utilisateurs list', error)
  if (shopsError) reportQueryError('admin/utilisateurs shops', shopsError)
  const shopByOwner = new Map(((shops as ShopRow[] | null) ?? []).map((s) => [s.owner_id, s]))
  const allRows = ((profiles as ProfileRow[] | null) ?? []).map((u) => ({
    ...u,
    roles: accountRoles(u),
    shop: shopByOwner.get(u.id) ?? null,
  }))
  const countFor = (role: AccountRole) => allRows.filter((u) => u.roles.includes(role)).length
  const rows = roleFilter ? allRows.filter((u) => u.roles.includes(roleFilter)) : allRows
  const filters: { role: AccountRole | null; label: string; count: number }[] = [
    { role: null, label: tr('admin.users.filter_all'), count: allRows.length },
    ...ACCOUNT_ROLES.map((role) => ({ role, label: tr(accountRoleI18nKey(role)), count: countFor(role) })),
  ]

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">{tr('admin.users.title')}</h1>

      {error || shopsError ? null : (
        <nav aria-label={tr('admin.users.filter_label')} className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = f.role === roleFilter
            return (
              <Link
                key={f.role ?? 'all'}
                href={f.role ? `/admin/utilisateurs?role=${f.role}` : '/admin/utilisateurs'}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${
                  active
                    ? 'border-brand-blue-600 bg-brand-blue-50 text-brand-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f.label}
                <span className="text-xs text-gray-500">{f.count}</span>
              </Link>
            )
          })}
        </nav>
      )}

      {error || shopsError ? (
        <ErrorState lang={lang} />
      ) : allRows.length === 0 ? (
        <p className="text-sm text-gray-500">{tr('admin.users.empty')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">{tr('admin.users.empty_filtered')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.users.field_name')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.users.field_email')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.users.field_roles')}</th>
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((role) => (
                        <span
                          key={role}
                          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[role]}`}
                        >
                          {tr(accountRoleI18nKey(role))}
                        </span>
                      ))}
                    </div>
                    {u.shop ? (
                      <Link
                        href={`/boutique/${u.shop.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        dir="auto"
                        className="mt-1 inline-block text-xs font-medium text-brand-blue-600 hover:underline"
                      >
                        {u.shop.name}
                        <span className="sr-only"> {tr('admin.users.opens_new_tab')}</span>
                      </Link>
                    ) : null}
                  </td>
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
