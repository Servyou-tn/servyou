'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Service = {
  id: string
  title: string
  starting_price_tnd: number
  delivery_time: string | null
  status: string
  categories: { name_fr: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  hidden: 'Masqué',
}

export default function ServicesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [fpId, setFpId] = useState<string | null>(null)
  const [services, setServices] = useState<Service[]>([])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('seller_type').eq('id', user.id).single()
    if (!profile || profile.seller_type !== 'freelancer') { router.replace('/devenir-vendeur'); return }

    const { data: fp } = await supabase
      .from('freelancer_profiles').select('id').eq('profile_id', user.id).maybeSingle()
    if (!fp) { router.replace('/mon-profil-freelance/creer'); return }

    setFpId(fp.id)

    const { data: rows } = await supabase
      .from('service_listings')
      .select('id, title, starting_price_tnd, delivery_time, status, categories(name_fr)')
      .eq('freelancer_profile_id', fp.id)
      .order('created_at', { ascending: false })

    setServices((rows as unknown as Service[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Supprimer le service "${title}" ? Cette action est irréversible.`)) return
    await supabase.from('service_listings').delete().eq('id', id)
    setServices(prev => prev.filter(s => s.id !== id))
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Mes services</h1>
          <Link
            href="/mon-profil-freelance/services/nouveau"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            + Ajouter un service
          </Link>
        </div>

        {services.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="mb-4">Vous n'avez pas encore de services.</p>
            <Link href="/mon-profil-freelance/services/nouveau" className="text-blue-600 hover:underline text-sm">
              Ajouter votre premier service
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Prix dès</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Délai</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.title}</td>
                    <td className="px-4 py-3 text-gray-600">{s.categories?.name_fr ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{Number(s.starting_price_tnd).toFixed(2)} TND</td>
                    <td className="px-4 py-3 text-gray-600">{s.delivery_time ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link href={`/mon-profil-freelance/services/${s.id}`} className="text-blue-600 hover:underline mr-4">
                        Modifier
                      </Link>
                      <button onClick={() => handleDelete(s.id, s.title)} className="text-red-500 hover:underline">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6">
          <Link href="/mon-profil-freelance" className="text-sm text-blue-600 hover:underline">
            ← Retour à mon espace freelance
          </Link>
        </div>
      </div>
    </main>
  )
}
