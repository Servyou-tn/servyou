import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FavoriteButton } from '@/components/FavoriteButton'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'

type Props = { params: Promise<{ id: string }> }

export default async function ServicePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const lang = await getLang()

  const { data: service } = await supabase
    .from('service_listings')
    .select('id, title, description, starting_price_tnd, delivery_time, status, categories(name_fr), freelancer_profiles(id, city, profiles:public_profiles(full_name))')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (!service) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-700">{t('service.not_found', lang)}</h1>
          <p className="text-gray-500 text-sm mt-2">{t('service.not_found_desc', lang)}</p>
          <Link href="/" className="block mt-4 text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('common.back_home', lang)}</Link>
        </div>
      </main>
    )
  }

  const fp = service.freelancer_profiles as unknown as { id: string; city: string | null; profiles: { full_name: string } | null } | null
  const category = service.categories as unknown as { name_fr: string } | null

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 mb-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h1 className="text-2xl font-bold text-gray-800">{service.title}</h1>
            <FavoriteButton item_type="service" item_id={service.id} />
          </div>

          <p className="text-2xl text-blue-700 font-bold mb-4">
            {t('service.from_price', lang)} {Number(service.starting_price_tnd).toFixed(2)} TND
          </p>

          {category && (
            <p className="text-sm text-gray-500 mb-2">
              {t('service.category_label', lang)} <span className="text-gray-700">{category.name_fr}</span>
            </p>
          )}

          {service.delivery_time && (
            <p className="text-sm text-gray-500 mb-4">
              {t('service.delay_label', lang)} <span className="text-gray-700">{service.delivery_time}</span>
            </p>
          )}

          {service.description && (
            <p className="text-gray-700 mb-6 whitespace-pre-line">{service.description}</p>
          )}

          {fp && (
            <div className="border-t border-gray-100 pt-4 mb-6">
              <p className="text-sm text-gray-500">
                {t('service.offered_by', lang)}{' '}
                <Link href={`/freelance/${fp.id}`} className="text-blue-600 hover:underline font-medium">
                  {fp.profiles?.full_name ?? t('job.freelancer_fallback', lang)}
                </Link>
                {fp.city ? ` · ${fp.city}` : ''}
              </p>
            </div>
          )}

          <Link href={`/service/${id}/demande`}
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded text-base transition-colors">
            {t('service.buy_cta', lang)}
          </Link>
        </div>

        <Link href="/" className="text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('common.back_home', lang)}</Link>
      </div>
    </main>
  )
}
