import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

type Props = { params: Promise<{ id: string }> }

export default async function PublicFreelancerPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const lang = await getLang()

  const formatYearRange = (start: number | null, end: number | null): string | null => {
    if (start === null) return null
    if (end === null) return `${start} — ${t('freelance.year_ongoing', lang)}`
    return `${start} — ${end}`
  }

  const { data: fp, error: fpError } = await supabase
    .from('freelancer_profiles')
    .select(`
      id, headline, bio, city, portfolio_link, years_experience, languages,
      working_hours, current_workplace, preferred_payment_method,
      profiles:public_profiles(full_name)
    `)
    .eq('id', id)
    .is('admin_hidden_at', null) // hide admin-moderated freelancer profiles from the public detail page
    .single()
  if (fpError) console.error('[freelance/[id]] profile fetch error:', fpError)

  if (!fp) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-700">{t('freelance.not_found', lang)}</h1>
          <p className="text-gray-500 text-sm mt-2">{t('freelance.not_found_desc', lang)}</p>
        </div>
      </main>
    )
  }

  const fullName = (fp.profiles as unknown as { full_name: string } | null)?.full_name

  const [{ data: skills }, { data: services }] = await Promise.all([
    supabase.from('freelancer_skills').select('id, name').eq('freelancer_profile_id', id).order('created_at', { ascending: true }),
    supabase.from('service_listings')
      .select('id, title, starting_price_tnd, delivery_time, categories(name_fr)')
      .eq('freelancer_profile_id', id).eq('status', 'active').order('created_at', { ascending: false }),
  ])

  // New child tables use freelancer_id (NOT freelancer_profile_id). New reads
  // get explicit error capture; existing skills/services reads left as-is.
  const { data: toolsRows, error: toolsError } = await supabase
    .from('freelancer_tools')
    .select('id, name')
    .eq('freelancer_id', id)
    .order('created_at')
  if (toolsError) console.error('[freelance/[id]] freelancer_tools fetch error:', toolsError)
  const tools = (toolsRows ?? []) as unknown as Array<{ id: string; name: string }>

  const { data: educationRows, error: eduError } = await supabase
    .from('freelancer_education')
    .select('id, institution, degree, field, year_start, year_end')
    .eq('freelancer_id', id)
    .order('year_start', { ascending: false, nullsFirst: false })
  if (eduError) console.error('[freelance/[id]] freelancer_education fetch error:', eduError)
  const education = (educationRows ?? []) as unknown as Array<{
    id: string; institution: string; degree: string | null; field: string | null; year_start: number | null; year_end: number | null
  }>

  const { data: certRows, error: certError } = await supabase
    .from('freelancer_certifications')
    .select('id, name, issuing_org, year_obtained, credential_url')
    .eq('freelancer_id', id)
    .order('year_obtained', { ascending: false, nullsFirst: false })
  if (certError) console.error('[freelance/[id]] freelancer_certifications fetch error:', certError)
  const certifications = (certRows ?? []) as unknown as Array<{
    id: string; name: string; issuing_org: string | null; year_obtained: number | null; credential_url: string | null
  }>

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
                <span className="font-medium text-gray-500">{t('freelance.experience_label', lang)}</span>{' '}
                {fp.years_experience} an{fp.years_experience !== 1 ? 's' : ''}
              </div>
            )}
            {fp.languages && (
              <div>
                <span className="font-medium text-gray-500">{t('freelance.languages_label', lang)}</span>{' '}
                {fp.languages}
              </div>
            )}
            {fp.portfolio_link && (
              <div className="col-span-2">
                <span className="font-medium text-gray-500">{t('freelance.portfolio_label', lang)}</span>{' '}
                <a href={fp.portfolio_link} target="_blank" rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all">
                  {fp.portfolio_link}
                </a>
              </div>
            )}
          </div>

          {(fp.working_hours || fp.current_workplace || fp.preferred_payment_method) && (
            <>
              <hr className="my-4 border-gray-200" />
              <div className="space-y-2">
                {fp.working_hours && (
                  <div>
                    <span className="text-sm text-gray-500">{t('freelance.field_working_hours', lang)}: </span>
                    <span className="text-sm text-gray-900">{fp.working_hours}</span>
                  </div>
                )}
                {fp.current_workplace && (
                  <div>
                    <span className="text-sm text-gray-500">{t('freelance.field_current_workplace', lang)}: </span>
                    <span className="text-sm text-gray-900">{fp.current_workplace}</span>
                  </div>
                )}
                {fp.preferred_payment_method && (
                  <div>
                    <span className="text-sm text-gray-500">{t('freelance.field_preferred_payment_method', lang)}: </span>
                    <span className="text-sm text-gray-900">{fp.preferred_payment_method}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {skills && skills.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-3">{t('freelance.skills_section', lang)}</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s.id} className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">{s.name}</span>
              ))}
            </div>
          </div>
        )}

        {tools.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-3">{t('freelance.section_tools', lang)}</h2>
            <div className="flex flex-wrap gap-2">
              {tools.map(tool => (
                <span key={tool.id} className="bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full">{tool.name}</span>
              ))}
            </div>
          </div>
        )}

        {education.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-3">{t('freelance.section_education', lang)}</h2>
            <div className="space-y-3">
              {education.map(edu => {
                const yearRange = formatYearRange(edu.year_start, edu.year_end)
                return (
                  <div key={edu.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="font-medium text-gray-900">{edu.institution}</div>
                    {(edu.degree || edu.field) && (
                      <div className="text-sm text-gray-700 mt-1">
                        {edu.degree}{edu.degree && edu.field ? ' — ' : ''}{edu.field}
                      </div>
                    )}
                    {yearRange && <div className="text-xs text-gray-500 mt-1">{yearRange}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {certifications.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-3">{t('freelance.section_certifications', lang)}</h2>
            <div className="space-y-3">
              {certifications.map(cert => (
                <div key={cert.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="font-medium text-gray-900">{cert.name}</div>
                  {cert.issuing_org && <div className="text-sm text-gray-700 mt-1">{cert.issuing_org}</div>}
                  {(cert.year_obtained || cert.credential_url) && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      {cert.year_obtained && <span>{cert.year_obtained}</span>}
                      {cert.credential_url && (
                        <a href={cert.credential_url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline">
                          {t('freelance.view_credential', lang)}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            {t('freelance.services_section', lang)}
            {services && services.length > 0 && (
              <span className="ms-2 text-sm font-normal text-gray-400">({services.length})</span>
            )}
          </h2>

          {!services || services.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              {t('freelance.no_services_public', lang)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map(s => {
                const category = (s.categories as unknown as { name_fr: string } | null)?.name_fr
                return (
                  <div key={s.id} className="bg-white rounded-lg shadow p-5 flex flex-col gap-2">
                    <h3 className="font-semibold text-gray-800">{s.title}</h3>
                    {category && (
                      <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 w-fit">{category}</span>
                    )}
                    <p className="text-blue-700 font-medium">
                      {t('freelance.from_price', lang)} {Number(s.starting_price_tnd).toFixed(2)} TND
                    </p>
                    {s.delivery_time && (
                      <p className="text-xs text-gray-500">{t('freelance.delay_label', lang)} {s.delivery_time}</p>
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
