'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getAge(dateOfBirth: string): number {
  const today = new Date()
  const dob = new Date(dateOfBirth)
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

export default function DevenirVendeurPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState('')
  const [sellerType, setSellerType] = useState<string | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('seller_type, date_of_birth')
        .eq('id', user.id)
        .single()

      if (profile) {
        setSellerType(profile.seller_type ?? null)
        if (profile.date_of_birth) setAge(getAge(profile.date_of_birth))
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleFreelancer() {
    if (!userId) return
    setError('')
    setUpgrading(true)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ seller_type: 'freelancer' })
      .eq('id', userId)

    setUpgrading(false)

    if (updateError) {
      setError('Une erreur est survenue. Veuillez réessayer.')
      return
    }

    router.push('/mon-profil-freelance/creer')
  }

  async function handleShopOwner() {
    if (!userId) return
    setError('')
    setUpgrading(true)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ seller_type: 'shop_owner' })
      .eq('id', userId)

    setUpgrading(false)

    if (updateError) {
      setError('Une erreur est survenue. Veuillez réessayer.')
      return
    }

    router.push('/ma-boutique/creer')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Devenir vendeur</h1>

        {age !== null && age < 18 ? (
          <p className="text-gray-600">
            Vous devez avoir au moins 18 ans pour vendre sur Servyou.
            Nous espérons vous accueillir bientôt en tant que vendeur !
          </p>
        ) : sellerType === 'shop_owner' ? (
          <p className="text-gray-600">
            Vous êtes déjà inscrit en tant que <strong>propriétaire de boutique</strong>.
          </p>
        ) : sellerType === 'freelancer' ? (
          <p className="text-gray-600">
            Vous êtes déjà inscrit en tant que <strong>freelance</strong>.
          </p>
        ) : (
          <>
            <p className="text-gray-600 mb-6">Choisissez votre type de compte vendeur :</p>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <div className="space-y-3">
              <button
                onClick={handleShopOwner}
                disabled={upgrading}
                className="w-full border-2 border-blue-600 hover:bg-blue-50 text-blue-700 font-medium py-3 px-4 rounded text-sm transition-colors disabled:opacity-50"
              >
                🛍️ Devenir vendeur (boutique)
              </button>

              <button
                onClick={handleFreelancer}
                disabled={upgrading}
                className="w-full border-2 border-gray-300 hover:bg-gray-50 text-gray-600 font-medium py-3 px-4 rounded text-sm transition-colors disabled:opacity-50"
              >
                💼 Devenir freelance
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
