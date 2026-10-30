'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { FOCUS_RING } from '@/components/layout/styles'
import { setFavoriteAction } from '@/app/actions/favorites'
import { favoriteReturnPath, signInHref, type FavoriteKind } from '@/lib/favorites/targets'
import type { SetFavoriteResult } from '@/app/actions/favorites'
import { t } from '@/lib/i18n'

// « Favorite Heart » — Figma 44×44 circle (surface/base, border/subtle, r 9999) with a 24 heart: ON = danger/500 filled,
// OFF = text/muted outline (720:62084 state=on, 390:10676 state=off). For SHOPS and FREELANCERS (D3, D4, and the cards on
// /mes-favoris); products and services keep their own FavoriteButton.
//
// OPTIMISTIC: the heart flips the instant it is pressed and the action runs behind it; a refusal puts it back and says so (toast).
// The action is IDEMPOTENT (it is told the state to reach, not « toggle »), so a double tap or a retry cannot invert the user's
// last intent. A GUEST is sent to /connexion?next=<the target's public page> — nothing is written, nothing optimistic happens.
export function FavoriteHeart({
  variant = 'circle',
  kind,
  targetId,
  name,
  initialFavorited,
  isLoggedIn,
  nextPath,
  onChange,
  className = '',
}: {
  /**
   * `circle` (default): the 44 round button of D3 / D4. `plain`: the bare 20 outline icon of the Freelancer Card (Figma 662:53894 — no circle,
   * text/muted, filled when favourited); the 44 px touch target is an invisible hit area around it.
   */
  variant?: 'circle' | 'plain'
  kind: FavoriteKind
  targetId: string
  /** The shop / freelancer's name — in the accessible label, so the hearts on a list are told apart. */
  name: string
  initialFavorited: boolean
  isLoggedIn: boolean
  /** Where a guest returns after signing in. Defaults to the target's own public page. */
  nextPath?: string
  /** Called with the NEW state right after the optimistic flip, and with the rolled-back state on a refusal. */
  onChange?: (favorited: boolean) => void
  className?: string
}) {
  const lang = useLang()
  const router = useRouter()
  const [favorited, setFavorited] = useState(initialFavorited)
  // The latest requested state: a refusal rolls back ONLY if nothing newer was requested in the meantime.
  const latest = useRef(initialFavorited)

  async function press() {
    if (!isLoggedIn) {
      router.push(signInHref(nextPath ?? favoriteReturnPath(kind, targetId)))
      return
    }
    const next = !favorited
    const previous = favorited
    latest.current = next
    setFavorited(next)
    onChange?.(next)

    let res: SetFavoriteResult
    try {
      res = await setFavoriteAction({ kind, targetId, favorited: next })
    } catch (e) {
      // Offline / 5xx / a thrown server action: treated exactly like a refusal — roll back and say so.
      console.error('[FavoriteHeart] setFavoriteAction rejected:', e instanceof Error ? e.message : 'unknown')
      res = { ok: false, error: t('common.error_generic', lang) }
    }
    if (!res.ok && latest.current === next) {
      latest.current = previous
      setFavorited(previous)
      onChange?.(previous)
      toast.error(res.error)
    }
  }

  // A toggle button keeps ONE name and exposes its state through aria-pressed (WAI-ARIA); flipping the label as well would read
  // « Retirer des favoris, activé ». The tooltip may still say what a press will do.
  const action = t(favorited ? 'favorites.remove' : 'favorites.add', lang)
  const label = t('favorites.toggle_named', lang, { name })

  return (
    <button
      type="button"
      onClick={press}
      aria-pressed={favorited}
      aria-label={label}
      title={action}
      className={
        variant === 'plain'
          ? `relative inline-flex size-5 shrink-0 items-center justify-center rounded-full ${FOCUS_RING} ${className}`
          : `inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-base transition-colors hover:bg-surface-subtle ${FOCUS_RING} ${className}`
      }
    >
      <Heart
        className={`${variant === 'plain' ? 'size-5' : 'size-6'} ${favorited ? 'fill-danger-500 text-danger-500' : 'text-text-muted'}`}
        aria-hidden="true"
      />
      {variant === 'plain' ? <span aria-hidden="true" className="absolute -inset-3" /> : null}
    </button>
  )
}
