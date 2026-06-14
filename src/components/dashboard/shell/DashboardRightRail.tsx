import { createClient } from '@/lib/supabase/server'
import { getDashboardProfile } from '@/lib/dashboard/data'
import { ProfileCard } from '@/components/dashboard/consumer/ProfileCard'
import { ActiveMissionsWidget, type MissionItem } from '@/components/dashboard/consumer/ActiveMissionsWidget'
import { CategoriesWidget } from '@/components/dashboard/consumer/CategoriesWidget'

type MissionRow = {
  id: string
  title: string
  budget_min: number | null
  budget_max: number | null
  job_responses: { count: number }[] | null
}

// Server-rendered right rail. Fetches the profile (deduped via cache with the layout)
// plus the rail's own stats, then hands plain data to the client cards. Rendered once
// by the shell; queries run a single time per request.
export async function DashboardRightRail({ userId }: { userId: string }) {
  const supabase = await createClient()
  const profile = await getDashboardProfile(userId)

  const [ordersCountRes, missionsCountRes, activeMissionsRes, categoriesRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', userId),
    supabase.from('job_posts').select('id', { count: 'exact', head: true }).eq('consumer_id', userId),
    supabase
      .from('job_posts')
      .select('id, title, budget_min, budget_max, job_responses(count)')
      .eq('consumer_id', userId)
      .in('status', ['open', 'filled'])
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('categories')
      .select('name_fr, slug')
      .is('parent_id', null)
      .order('name_fr', { ascending: true })
      .limit(6),
  ])

  if (ordersCountRes.error) console.error('[rightRail] orders count error:', ordersCountRes.error)
  if (missionsCountRes.error) console.error('[rightRail] missions count error:', missionsCountRes.error)
  if (activeMissionsRes.error) console.error('[rightRail] active missions error:', activeMissionsRes.error)
  if (categoriesRes.error) console.error('[rightRail] categories error:', categoriesRes.error)

  const missions: MissionItem[] = ((activeMissionsRes.data as unknown as MissionRow[]) ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    budgetMin: m.budget_min,
    budgetMax: m.budget_max,
    responseCount: m.job_responses?.[0]?.count ?? 0,
  }))
  const categories = (categoriesRes.data as { name_fr: string; slug: string }[] | null) ?? []

  return (
    <div className="space-y-4">
      <ProfileCard
        fullName={profile?.full_name ?? null}
        city={profile?.city ?? null}
        ordersCount={ordersCountRes.count ?? 0}
        missionsCount={missionsCountRes.count ?? 0}
      />
      <ActiveMissionsWidget missions={missions} />
      {categories.length > 0 ? <CategoriesWidget categories={categories} /> : null}
    </div>
  )
}
