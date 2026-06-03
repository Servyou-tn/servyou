import { createClient } from '@/lib/supabase/server'

type Props = { params: Promise<{ id: string }> }

export default async function PublicFreelancerPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: fp } = await supabase
    .from('freelancer_profiles')
    .select('id, headline, bio, city, portfolio_link, years_experience, languages, profiles(full_name)')
    .eq('id', id)
    .single()

  if (!fp) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-700">Profil introuvable</h1>
          <p className="text-gray-500 text-sm mt-2">Ce profil freelance n'existe pas ou a été supprimé.</p>
        </div>
      </main>
    )
  }

  const fullName = (fp.profiles as unknown as { full_name: string } | null)?.full_name

  const [{ data: skills }, { data: services }] = await Promise.all([
    supabase
      .from('freelancer_skills')
      .select('id, name')
      .eq('freelancer_profile_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('service_listings')
      .select('id, title, starting_price_tnd, delivery_time, categories(name_fr)')
      .eq('freelancer_profile_id', id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
  ])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="bg-white rounded-lg shadow p-8">
          {fullName && <p className="text-sm text-gray-500 mb-1">{fullName}</p>}
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{fp.headline}</h1>
          {fp.city && <p className="text-sm text-gray-500 mb-4">{fp.city}</p>}
          {fp.bio && <p className="text-gray-700 mb-4">{fp.bio}</p>}

          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            {fp.years_experience != null && (
              <div>
                <span className="font-medium text-gray-500">Expérience :</span>{' '}
                {fp.years_experience} an{fp.years_experience !== 1 ? 's' : ''}
              </div>
            )}
            {fp.languages && (
              <div>
                <span className="font-medium text-gray-500">Langues :</span>{' '}
                {fp.languages}
              </div>
            )}
            {fp.portfolio_link && (
              <div className="col-span-2">
                <span className="font-medium text-gray-500">Portfolio :</span>{' '}
                <a href={fp.portfolio_link} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all">
                  {fp.portfolio_link}
                </a>
              </div>
            )}
          </div>
        </div>

        {skills && skills.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-3">Compétences</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s.id}
                  className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Services disponibles
            {services && services.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({services.length})</span>
            )}
          </h2>

          {!services || services.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Aucun service disponible pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map(s => {
                const category = (s.categories as unknown as { name_fr: string } | null)?.name_fr
                return (
                  <div key={s.id} className="bg-white rounded-lg shadow p-5 flex flex-col gap-2">
                    <h3 className="font-semibold text-gray-800">{s.title}</h3>
                    {category && (
                      <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 w-fit">
                        {category}
                      </span>
                    )}
                    <p className="text-blue-700 font-medium">
                      À partir de {Number(s.starting_price_tnd).toFixed(2)} TND
                    </p>
                    {s.delivery_time && (
                      <p className="text-xs text-gray-500">Délai : {s.delivery_time}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
