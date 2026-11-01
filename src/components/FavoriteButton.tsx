'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { FOCUS_RING } from '@/components/layout/styles'
import { useLang } from './LangProvider'
import { t } from '@/lib/i18n'

type Props = {
  item_type: 'product' | 'service'
  item_id: string
  /**
   * `glyph` (default): the text ♡ / ♥ the product pages still use. `icon`: the Figma « icon-heart » — a plain 20 outline icon, text/muted, filled
   * danger/500 when favourited, no padding (the 44 px touch target is an invisible hit area around it). Service Card: 1486:24359 / 1488:66061.
   * `box`: the D2 375 frame's `icon-heart-btn` (m375-d2-service) — a 44 px bordered r10 button filling its cell, icon-heart 20 + `label` (13 Medium, text/secondary).
   */
  variant?: 'glyph' | 'icon' | 'box'
  /** `box` only: the visible text next to the heart. The accessible name stays the action (« Ajouter aux favoris »), which contains it. */
  label?: string
  /** `box` only: extra classes for the label (D2 hides it from `lg` up, where the frame is icon-only). */
  labelClassName?: string
}

export function FavoriteButton({ item_type, item_id, variant = 'glyph', label: boxLabel, labelClassName = '' }: Props) {
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

  const boxClass = `flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-surface-base transition-colors hover:bg-surface-subtle disabled:opacity-50 motion-reduce:transition-none ${FOCUS_RING}`
  const boxText = boxLabel ? <span className={`text-[13px] font-medium leading-4 text-text-secondary ${labelClassName}`}>{boxLabel}</span> : null

  if (loading) {
    if (variant === 'box') {
      return (
        <button disabled aria-label={t('common.loading', lang)} className={boxClass}>
          <Heart className="size-5 text-text-muted" aria-hidden="true" />
          {boxText}
        </button>
      )
    }
    if (variant === 'icon') {
      return (
        <button disabled aria-label={t('common.loading', lang)} className={`${iconClass} text-text-muted`}>
          <Heart className="size-5" aria-hidden="true" />
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

  if (variant === 'box') {
    return (
      <button onClick={handleToggle} disabled={toggling} title={label} aria-label={label} className={boxClass}>
        <Heart className={`size-5 ${favorited ? 'fill-danger-500 text-danger-500' : 'text-text-muted'}`} aria-hidden="true" />
        {boxText}
      </button>
    )
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={toggling}
        title={label}
        aria-label={label}
        className={iconClass}
      >
        <Heart className={`size-5 ${favorited ? 'fill-danger-500 text-danger-500' : 'text-text-muted'}`} aria-hidden="true" />
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
