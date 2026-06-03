'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  item_type: 'product' | 'service'
  item_id: string
}

export function FavoriteButton({ item_type, item_id }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [loggedIn, setLoggedIn] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      setLoggedIn(true)

      const col = item_type === 'product' ? 'product_id' : 'service_listing_id'
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_type', item_type)
        .eq(col, item_id)
        .maybeSingle()

      if (data) { setFavorited(true); setFavoriteId(data.id) }
      setLoading(false)
    }
    init()
  }, [item_id, item_type])

  async function handleToggle() {
    if (!loggedIn) { router.push('/login'); return }
    if (toggling) return
    setToggling(true)

    if (favorited && favoriteId) {
      await supabase.from('favorites').delete().eq('id', favoriteId)
      setFavorited(false)
      setFavoriteId(null)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const col = item_type === 'product' ? 'product_id' : 'service_listing_id'
      const { data } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          item_type,
          product_id: item_type === 'product' ? item_id : null,
          service_listing_id: item_type === 'service' ? item_id : null,
        })
        .select('id')
        .single()

      if (data) { setFavorited(true); setFavoriteId(data.id) }
    }

    setToggling(false)
  }

  if (loading) {
    return (
      <button disabled aria-label="Chargement…"
        className="p-2 rounded-full text-gray-300">
        ♡
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      title={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-label={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`p-2 rounded-full transition-colors text-xl leading-none disabled:opacity-50 ${
        favorited
          ? 'text-red-500 hover:text-red-400'
          : 'text-gray-400 hover:text-red-400'
      }`}
    >
      {favorited ? '♥' : '♡'}
    </button>
  )
}
