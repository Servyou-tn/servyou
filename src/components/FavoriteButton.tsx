'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from './LangProvider'
import { t } from '@/lib/i18n'

type Props = {
  item_type: 'product' | 'service'
  item_id: string
  /**
   * `glyph` (default): the text ♡ / ♥ the product pages still use. `icon`: the Figma « icon-heart » — a plain 20 outline icon, text/muted, filled
   * danger/500 when favourited, no padding (the 44 px touch target is an invisible hit area around it). Service Card: 1486:24359 / 1488:66061.
   */
  variant?: 'glyph' | 'icon'
  /** `icon` only: size + colour of the heart (default `size-5 text-text-muted`, the Service Card's). The favourited fill is always danger/500. */
  iconClassName?: string
}

export function FavoriteButton({ item_type, item_id, variant = 'glyph', iconClassName = 'size-5 text-text-muted' }: Props) {
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

  const iconClass = 'relative inline-flex size-5 shrink-0 items-center justify-center rounded-full disabled:opacity-50'

  if (loading) {
    if (variant === 'icon') {
      return (
        <button disabled aria-label={t('common.loading', lang)} className={`${iconClass} text-text-muted`}>
          <Heart className={iconClassName} aria-hidden="true" />
        </button>
      )
    }
    return (
      <button disabled aria-label={t('common.loading', lang)}
        className="p-2 rounded-full text-gray-300">
        ♡
      </button>
    )
  }

  const label = favorited ? t('favorites.remove', lang) : t('favorites.add', lang)

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={toggling}
        title={label}
        aria-label={label}
        className={iconClass}
      >
        <Heart className={`${iconClassName} ${favorited ? 'fill-danger-500 text-danger-500' : ''}`} aria-hidden="true" />
        <span aria-hidden="true" className="absolute -inset-3" />
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      title={label}
      aria-label={label}
      className={`p-2 rounded-full transition-colors text-xl leading-none disabled:opacity-50 ${
        favorited ? 'text-red-500' : 'text-text-muted'
      }`}
    >
      {favorited ? '♥' : '♡'}
    </button>
  )
}
