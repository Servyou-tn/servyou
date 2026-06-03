import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RespondForm } from '@/components/RespondForm'
import { JOB_POST_EXPIRY_DAYS, MAX_RESPONSES_PER_POST } from '@/lib/job-constants'

type Props = { params: Promise<{ id: string }> }

export default async function MissionDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: post } = await supabase
    .from('job_posts')
    .select(`
      id, title, description, budget_min, budget_max, city, is_remote, deadline,
      status, created_at, consumer_id,
      categories(name_fr),
      job_responses(id),
      job_post_skills(skill)
    `)
    .eq('id', id)
    .single()

  if (!post || post.status === 'deleted') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-700">Mission introuvable</h1>
          <p className="text-gray-500 text-sm mt-2">Cette mission n'existe pas ou a été supprimée.</p>
          <Link href="/missions" className="block mt-4 text-sm text-blue-600 hover:underline">← Tableau des missions</Link>
        </div>
      </main>
    )
  }

  type RawPost = typeof post & {
    categories: { name_fr: string } | null
    job_responses: { id: string }[]
    job_post_skills: { skill: string }[]
  }
  const p = post as unknown as RawPost

  const isExpired = p.status === 'open' &&
    new Date(p.created_at) < new Date(Date.now() - JOB_POST_EXPIRY_DAYS * 86400000)
  const isClosed = p.status !== 'open' || isExpired
  const responseCount = p.job_responses.length
  const isCapped = responseCount >= MAX_RESPONSES_PER_POST
  const skills = p.job_post_skills.map((s: { skill: string }) => s.skill)

  const date = new Date(p.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })

  function budgetLabel() {
    if (!p.budget_min && !p.budget_max) return null
    if (p.budget_min && p.budget_max) return `${Number(p.budget_min).toFixed(0)} – ${Number(p.budget_max).toFixed(0)} TND`
    if (p.budget_min) return `Dès ${Number(p.budget_min).toFixed(0)} TND`
    return `Jusqu'à ${Number(p.budget_max).toFixed(0)} TND`
  }

  // Check existing response + consumer phone (only fetched when user is logged in)
  let hasResponded = false
  let consumerPhone: string | null = null
  let sellerType: string | null = null
  let isOwnPost = false

  if (user) {
    isOwnPost = p.consumer_id === user.id

    const [{ data: existingResp }, { data: consumerProfile }, { data: userProfile }] = await Promise.all([
      supabase
        .from('job_responses')
        .select('id')
        .eq('job_post_id', id)
        .eq('freelancer_id', user.id)
        .maybeSingle(),
      // Fetch consumer phone only for logged-in users (gate at app layer)
      supabase.from('profiles').select('phone').eq('id', p.consumer_id).single(),
      supabase.from('profiles').select('seller_type').eq('id', user.id).single(),
    ])

    hasResponded = !!existingResp
    consumerPhone = consumerProfile?.phone ?? null
    sellerType = userProfile?.seller_type ?? null
  }

  const budget = budgetLabel()

  // Determine what respond section to show
  let respondSection: React.ReactNode

  if (!user) {
    respondSection = (
      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-700">
        <Link href="/login" className="font-medium hover:underline">Connectez-vous</Link>
        {' '}pour répondre à cette mission.
      </div>
    )
  } else if (isOwnPost) {
    respondSection = (
      <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-500">
        Ceci est votre propre mission.{' '}
        <Link href="/mes-missions" className="text-blue-600 hover:underline">Gérer mes missions →</Link>
      </div>
    )
  } else if (isClosed) {
    respondSection = (
      <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-500">
        {p.status === 'filled' ? 'Cette mission a été pourvue.' : 'Cette mission a expiré.'}
      </div>
    )
  } else if (sellerType !== 'freelancer') {
    respondSection = (
      <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-500">
        Seuls les freelancers peuvent répondre aux missions.{' '}
        <Link href="/devenir-vendeur" className="text-blue-600 hover:underline">Devenir freelancer →</Link>
      </div>
    )
  } else if (hasResponded) {
    const phone = consumerPhone?.replace(/\s+/g, '')
    const waText = encodeURIComponent(
      `Bonjour, j'ai répondu à votre mission "${p.title}" sur Servyou et je serais ravi(e) d'en discuter.`
    )
    respondSection = (
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded px-4 py-3 text-sm text-green-700">
          Vous avez déjà envoyé une candidature pour cette mission.
        </div>
        {phone ? (
          <a href={`https://wa.me/${phone}?text=${waText}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-medium text-sm px-4 py-2 rounded transition-colors">
            Contacter le client sur WhatsApp
          </a>
        ) : (
          <p className="text-sm text-gray-500">Le client n'a pas renseigné son numéro. Il vous contactera directement.</p>
        )}
      </div>
    )
  } else if (isCapped) {
    respondSection = (
      <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-700">
        Cette mission a atteint le nombre maximum de réponses ({MAX_RESPONSES_PER_POST}).
      </div>
    )
  } else {
    respondSection = (
      <RespondForm
        jobPostId={id}
        jobPostTitle={p.title}
        consumerPhone={consumerPhone}
        currentResponseCount={responseCount}
      />
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 mb-4 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{p.title}</h1>
            <p className="text-xs text-gray-500">
              {p.is_remote ? 'À distance' : (p.city ?? '')}
              {p.categories ? ` · ${(p.categories as unknown as { name_fr: string }).name_fr}` : ''}
              {' · Publié le '}{date}
              {' · '}{responseCount} réponse{responseCount !== 1 ? 's' : ''}
            </p>
          </div>

          {budget && (
            <p className="text-2xl font-bold text-blue-700">{budget}</p>
          )}

          {p.deadline && (
            <p className="text-sm text-gray-500">
              Date limite :{' '}
              <span className="text-gray-700">
                {new Date(p.deadline).toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </p>
          )}

          <p className="text-gray-700 whitespace-pre-line">{p.description}</p>

          {skills.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Compétences recherchées</p>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s} className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-semibold text-gray-700 mb-3">Répondre à cette mission</h2>
            {respondSection}
          </div>
        </div>

        <Link href="/missions" className="text-sm text-blue-600 hover:underline">← Tableau des missions</Link>
      </div>
    </main>
  )
}
