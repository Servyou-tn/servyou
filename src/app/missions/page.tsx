import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { JOB_POST_EXPIRY_DAYS, MAX_RESPONSES_PER_POST } from '@/lib/job-constants'

type SearchParams = Promise<{
  categorie?: string
  ville?: string
  budget_max?: string
  competence?: string
}>

type Post = {
  id: string
  title: string
  description: string
  budget_min: number | null
  budget_max: number | null
  city: string | null
  is_remote: boolean
  deadline: string | null
  created_at: string
  categories: { name_fr: string } | null
  response_count: number
  skills: string[]
}

function budgetLabel(min: number | null, max: number | null, lang: Lang) {
  if (!min && !max) return null
  if (min && max) return `${Number(min).toFixed(0)} – ${Number(max).toFixed(0)} TND`
  if (min) return `${t('missions.budget_from', lang)} ${Number(min).toFixed(0)} TND`
  return `${t('missions.budget_to', lang)} ${Number(max).toFixed(0)} TND`
}

export default async function MissionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { categorie, ville, budget_max, competence } = await searchParams
  const supabase = await createClient()
  const lang = await getLang()

  const cutoff = new Date(Date.now() - JOB_POST_EXPIRY_DAYS * 86400000).toISOString()

  const [{ data: categories }] = await Promise.all([
    supabase.from('categories').select('id, name_fr, slug').order('name_fr'),
  ])

  // Two-step skills filter: get matching post IDs first
  let skillFilterIds: string[] | null = null
  if (competence) {
    const { data: matchingSkills } = await supabase
      .from('job_post_skills')
      .select('job_post_id')
      .ilike('skill', `%${competence}%`)
    skillFilterIds = matchingSkills ? [...new Set(matchingSkills.map((r: { job_post_id: string }) => r.job_post_id))] : []
  }

  let query = supabase
    .from('job_posts')
    .select(`
      id, title, description, budget_min, budget_max, city, is_remote, deadline, created_at,
      categories(name_fr),
      job_responses(id)
    `)
    .eq('status', 'open')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })

  if (categorie) query = query.eq('category_id', categorie)
  if (ville) query = query.ilike('city', `%${ville}%`)
  if (budget_max) query = query.or(`budget_max.lte.${budget_max},budget_max.is.null`)
  if (skillFilterIds !== null) {
    if (skillFilterIds.length === 0) {
      return renderPage([], categories, { categorie, ville, budget_max, competence }, lang)
    }
    query = query.in('id', skillFilterIds)
  }

  const { data: rawPosts } = await query

  type RawPost = {
    id: string
    title: string
    description: string
    budget_min: number | null
    budget_max: number | null
    city: string | null
    is_remote: boolean
    deadline: string | null
    created_at: string
    categories: { name_fr: string } | null
    job_responses: { id: string }[]
  }

  const typedRaw = (rawPosts as unknown as RawPost[]) ?? []

  // Fetch skills for each post
  const postIds = typedRaw.map(p => p.id)
  const { data: allSkills } = postIds.length > 0
    ? await supabase.from('job_post_skills').select('job_post_id, skill').in('job_post_id', postIds)
    : { data: [] }

  const skillsByPost: Record<string, string[]> = {}
  for (const sk of (allSkills ?? []) as { job_post_id: string; skill: string }[]) {
    skillsByPost[sk.job_post_id] = [...(skillsByPost[sk.job_post_id] ?? []), sk.skill]
  }

  const posts: Post[] = typedRaw.map(p => ({
    ...p,
    response_count: p.job_responses.length,
    skills: skillsByPost[p.id] ?? [],
  }))

  return renderPage(posts, categories, { categorie, ville, budget_max, competence }, lang)
}

function renderPage(
  posts: Post[],
  categories: { id: string; name_fr: string; slug: string }[] | null,
  filters: { categorie?: string; ville?: string; budget_max?: string; competence?: string },
  lang: Lang,
) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{t('missions.title', lang)}</h1>
          <Link href="/poster-mission"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors">
            {t('missions.post_btn', lang)}
          </Link>
        </div>

        {/* Filters */}
        <form method="GET" action="/missions" className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3">
          <select name="categorie" defaultValue={filters.categorie ?? ''}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{t('missions.filter_all_cats', lang)}</option>
            {(categories ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.name_fr}</option>
            ))}
          </select>

          <input name="ville" type="text" defaultValue={filters.ville ?? ''}
            placeholder={t('missions.filter_city', lang)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />

          <input name="budget_max" type="number" min="0" defaultValue={filters.budget_max ?? ''}
            placeholder={t('missions.filter_budget_max', lang)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />

          <input name="competence" type="text" defaultValue={filters.competence ?? ''}
            placeholder={t('missions.filter_skill', lang)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />

          <button type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors">
            {t('missions.filter_btn', lang)}
          </button>
          {Object.values(filters).some(Boolean) && (
            <a href="/missions" className="text-sm text-gray-500 hover:underline self-center">
              {t('missions.filter_reset', lang)}
            </a>
          )}
        </form>

        {/* Results */}
        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {t('missions.empty', lang)}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => {
              const budget = budgetLabel(post.budget_min, post.budget_max, lang)
              const date = new Date(post.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
              const capped = post.response_count >= MAX_RESPONSES_PER_POST
              return (
                <div key={post.id} className="bg-white rounded-lg shadow p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={`/missions/${post.id}`}
                        className="font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                        {post.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {post.is_remote ? t('missions.remote', lang) : (post.city ?? '')}
                        {post.categories ? ` · ${(post.categories as unknown as { name_fr: string }).name_fr}` : ''}
                        {' · '}{date}
                      </p>
                    </div>
                    {budget && (
                      <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">{budget}</span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2">{post.description}</p>

                  {post.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {post.skills.map(s => (
                        <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-gray-400">
                      {post.response_count} {post.response_count > 1 ? t('missions.response_plural', lang) : t('missions.response_singular', lang)}
                      {post.deadline ? ` · ${t('missions.deadline_prefix', lang)}${new Date(post.deadline).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' })}` : ''}
                    </span>
                    {capped ? (
                      <span className="text-xs text-gray-400 italic">{t('missions.full', lang)}</span>
                    ) : (
                      <Link href={`/missions/${post.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        {t('missions.view_respond', lang)}
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline">{t('common.back_home', lang)}</Link>
        </div>
      </div>
    </main>
  )
}
