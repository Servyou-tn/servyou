'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'
import { JOB_POST_EXPIRY_DAYS } from '@/lib/job-constants'

type Responder = {
  id: string
  proposal_message: string | null
  created_at: string
  freelancer_id: string
  fpId: string | undefined
  profiles: { full_name: string; phone: string | null } | null
}

type Post = {
  id: string
  title: string
  status: string
  created_at: string
  is_remote: boolean
  city: string | null
  categories: { name_fr: string } | null
  responses: Responder[]
}

const STATUS_LABELS: Record<string, { key: string; cls: string }> = {
  open:    { key: 'job.status_open',    cls: 'bg-green-100 text-green-700' },
  filled:  { key: 'job.status_filled',  cls: 'bg-blue-100 text-blue-700' },
  expired: { key: 'job.status_expired', cls: 'bg-gray-100 text-gray-500' },
  deleted: { key: 'job.status_deleted', cls: 'bg-red-100 text-red-500' },
}

function effectiveStatus(post: { status: string; created_at: string }) {
  if (post.status !== 'open') return post.status
  const age = (Date.now() - new Date(post.created_at).getTime()) / 86400000
  return age > JOB_POST_EXPIRY_DAYS ? 'expired' : 'open'
}

export default function MesMissionsPage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data, error: postsError } = await supabase
        .from('job_posts')
        .select(`
          id, title, status, created_at, is_remote, city,
          categories(name_fr),
          responses:job_responses(
            id, proposal_message, created_at, freelancer_id
          )
        `)
        .eq('consumer_id', user.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })

      if (postsError) {
        console.error('[mes-missions] job_posts query error:', postsError)
        setLoading(false)
        return
      }

      type RawPost = Omit<Post, 'responses'> & { responses: { id: string; proposal_message: string | null; created_at: string; freelancer_id: string }[] }
      const rawPosts = (data as unknown as RawPost[]) ?? []
      const freelancerIds = [...new Set(rawPosts.flatMap(p => p.responses.map(r => r.freelancer_id)))]

      const nameMap: Record<string, string> = {}
      const phoneMap: Record<string, string | null> = {}
      const fpMap: Record<string, string> = {}

      if (freelancerIds.length > 0) {
        const { data: pubs, error: pubsError } = await supabase
          .from('public_profiles')
          .select('id, full_name')
          .in('id', freelancerIds)
        if (pubsError) console.error('[mes-missions] public_profiles query error:', pubsError)
        for (const pub of pubs ?? []) nameMap[pub.id] = pub.full_name ?? ''

        const { data: fpRows, error: fpError } = await supabase
          .from('freelancer_profiles')
          .select('id, profile_id')
          .in('profile_id', freelancerIds)
        if (fpError) console.error('[mes-missions] freelancer_profiles query error:', fpError)
        for (const fp of fpRows ?? []) fpMap[fp.profile_id] = fp.id

        await Promise.all(freelancerIds.map(async fid => {
          const { data: ph, error: phError } = await supabase.rpc('get_contact_phone', { target: fid })
          if (phError) console.error(`[mes-missions] get_contact_phone error for ${fid}:`, phError)
          phoneMap[fid] = ph ?? null
        }))
      }

      setPosts(rawPosts.map(post => ({
        ...post,
        responses: post.responses.map(r => ({
          ...r,
          fpId: fpMap[r.freelancer_id],
          profiles: { full_name: nameMap[r.freelancer_id] ?? '', phone: phoneMap[r.freelancer_id] ?? null },
        })),
      })))
      setLoading(false)
    }
    load()
  }, [])

  async function markFilled(id: string) {
    await supabase.from('job_posts').update({ status: 'filled', updated_at: new Date().toISOString() }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status: 'filled' } : p))
  }

  async function deletePost(id: string) {
    if (!window.confirm(t('job.delete_confirm', lang))) return
    await supabase.from('job_posts').update({ status: 'deleted', updated_at: new Date().toISOString() }).eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('job.my_missions_title', lang)}</h1>
          <Link href="/poster-mission"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors">
            {t('job.new_mission_btn', lang)}
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="mb-4">{t('job.no_missions', lang)}</p>
            <Link href="/poster-mission" className="text-blue-600 hover:underline text-sm">
              {t('job.no_missions_cta', lang)}
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map(post => {
              const status = effectiveStatus(post)
              const sl = STATUS_LABELS[status]
              const label = sl ? t(sl.key, lang) : status
              const cls = sl?.cls ?? 'bg-gray-100 text-gray-600'
              const date = new Date(post.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <div key={post.id} className="bg-white rounded-lg shadow p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{post.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {post.is_remote ? t('missions.remote', lang) : (post.city ?? '')}
                        {post.categories ? ` · ${(post.categories as unknown as { name_fr: string }).name_fr}` : ''}
                        {' · '}{date}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${cls}`}>
                      {label}
                    </span>
                  </div>

                  {/* Responders */}
                  {post.responses.length > 0 ? (
                    <div className="border-t border-gray-100 pt-3 space-y-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {post.responses.length} {post.responses.length > 1 ? t('missions.response_plural', lang) : t('missions.response_singular', lang)}
                      </p>
                      {post.responses.map(r => {
                        const phone = r.profiles?.phone?.replace(/\s+/g, '')
                        const waText = encodeURIComponent(
                          t('job.whatsapp_consumer_to_responder', lang, { mission: post.title })
                        )
                        return (
                          <div key={r.id} className="bg-gray-50 rounded p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-800">
                                {r.profiles?.full_name || t('job.freelancer_fallback', lang)}
                              </p>
                              {r.fpId && (
                                <Link href={`/freelance/${r.fpId}`}
                                  className="text-xs text-blue-600 hover:underline">
                                  {t('job.view_profile', lang)}
                                </Link>
                              )}
                            </div>
                            {r.proposal_message && (
                              <p className="text-sm text-gray-600">{r.proposal_message}</p>
                            )}
                            {phone && (
                              <a href={`https://wa.me/${phone}?text=${waText}`}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-block bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                                {t('common.whatsapp_contact', lang)}
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 border-t border-gray-100 pt-3">
                      {t('job.no_responses', lang)}
                    </p>
                  )}

                  {/* Actions */}
                  {status === 'open' && (
                    <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                      <Link href={`/mes-missions/${post.id}/modifier`}
                        className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        {t('common.edit', lang)}
                      </Link>
                      <button onClick={() => markFilled(post.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        {t('job.mark_filled', lang)}
                      </button>
                      <button onClick={() => deletePost(post.id)}
                        className="border border-red-300 hover:bg-red-50 text-red-600 text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        {t('common.delete', lang)}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('common.back_home', lang)}</Link>
        </div>
      </div>
    </main>
  )
}
