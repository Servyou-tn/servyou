import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'
import { JOB_POST_EXPIRY_DAYS } from '@/lib/job-constants'

export default async function MesReponsesPage() {
  const supabase = await createClient()
  const lang = await getLang()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/connexion')

  const { data: profile } = await supabase
    .from('profiles').select('seller_type').eq('id', user.id).single()
  if (!profile || profile.seller_type !== 'freelancer') redirect('/')

  const { data: responses } = await supabase
    .from('job_responses')
    .select(`
      id, proposal_message, created_at,
      job_posts(id, title, status, created_at, city, is_remote, budget_min, budget_max)
    `)
    .eq('freelancer_id', user.id)
    .order('created_at', { ascending: false })

  type RawResponse = {
    id: string
    proposal_message: string | null
    created_at: string
    job_posts: {
      id: string
      title: string
      status: string
      created_at: string
      city: string | null
      is_remote: boolean
      budget_min: number | null
      budget_max: number | null
    } | null
  }

  const rows = (responses as unknown as RawResponse[]) ?? []
  const cutoff = new Date(Date.now() - JOB_POST_EXPIRY_DAYS * 86400000)

  function effectiveStatus(post: RawResponse['job_posts']) {
    if (!post) return 'deleted'
    if (post.status !== 'open') return post.status
    return new Date(post.created_at) < cutoff ? 'expired' : 'open'
  }

  const STATUS_LABELS: Record<string, { key: string; cls: string }> = {
    open:    { key: 'job.response_active', cls: 'bg-green-100 text-green-700' },
    filled:  { key: 'job.status_filled',   cls: 'bg-blue-100 text-blue-700' },
    expired: { key: 'job.status_expired',  cls: 'bg-gray-100 text-gray-500' },
    deleted: { key: 'job.status_deleted',  cls: 'bg-red-100 text-red-400' },
  }

  const active = rows.filter(r => effectiveStatus(r.job_posts) === 'open')
  const closed = rows.filter(r => effectiveStatus(r.job_posts) !== 'open')

  function renderRow(r: RawResponse) {
    const post = r.job_posts
    const status = effectiveStatus(post)
    const sl = STATUS_LABELS[status]
    const label = sl ? t(sl.key, lang) : status
    const cls = sl?.cls ?? 'bg-gray-100 text-gray-600'
    const date = new Date(r.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
    return (
      <div key={r.id} className="bg-white rounded-lg shadow p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {post ? (
              <Link href={`/missions/${post.id}`}
                className="font-medium text-gray-800 hover:text-blue-600 transition-colors">
                {post.title}
              </Link>
            ) : (
              <p className="font-medium text-gray-400">{t('job.deleted_mission', lang)}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">
              {post ? (post.is_remote ? t('missions.remote', lang) : (post.city ?? '')) : ''}
              {t('job.response_date_prefix', lang)}{date}
            </p>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${cls}`}>
            {label}
          </span>
        </div>
        {r.proposal_message && (
          <p className="text-sm text-gray-600 line-clamp-2">{r.proposal_message}</p>
        )}
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{t('job.my_responses_title', lang)}</h1>
          <Link href="/missions" className="text-sm text-blue-600 hover:underline">
            {t('job.board_link', lang)}{' '}<DirArrow lang={lang} direction="forward" />
          </Link>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t('job.active_section', lang, { n: active.length })}
          </h2>
          {active.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('job.no_active_responses', lang)}</p>
          ) : (
            <div className="space-y-3">
              {active.map(renderRow)}
            </div>
          )}
        </section>

        {closed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {t('job.history_section', lang, { n: closed.length })}
            </h2>
            <div className="space-y-3">
              {closed.map(renderRow)}
            </div>
          </section>
        )}

        <div>
          <Link href="/" className="text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('common.back_home', lang)}</Link>
        </div>
      </div>
    </main>
  )
}
