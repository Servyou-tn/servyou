'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from './LangProvider'
import { t } from '@/lib/i18n'

type Props = {
  item_type: 'product' | 'service'
  item_id: string
}

export function FavoriteButton({ item_type, item_id }: Props) {
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const lang = useLang()

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
  }, [item_id, item_type, supabase])

  async function handleToggle() {
    if (!loggedIn) { router.push('/connexion'); return }
    if (toggling) return
    setToggling(true)

    if (favorited && favoriteId) {
      await supabase.from('favorites').delete().eq('id', favoriteId)
      setFavorited(false)
      setFavoriteId(null)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/connexion'); return }

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

    // Re-fetch server components so a server-rendered list (e.g. /mes-favoris) drops the
    // item the moment it's unfavorited. Harmless elsewhere (e.g. /marche just re-reads).
    router.refresh()
    setToggling(false)
  }

  if (loading) {
    return (
      <button disabled aria-label={t('common.loading', lang)}
        className="p-2 rounded-full text-gray-300">
        ♡
      </button>
    )
  }

  const label = favorited ? t('favorites.remove', lang) : t('favorites.add', lang)

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      title={label}
      aria-label={label}
      className={`p-2 rounded-full transition-colors text-xl leading-none disabled:opacity-50 ${
        favorited ? 'text-red-500' : 'text-[#8B8B8B]'
      }`}
    >
      {favorited ? '♥' : '♡'}
    </button>
  )
}
