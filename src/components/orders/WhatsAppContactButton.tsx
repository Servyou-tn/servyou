'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { buildWhatsAppUrl } from '@/lib/orders/whatsapp'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// Seller → buyer WhatsApp contact, shared by G8's row and G9's detail panels.
//
// ⚑ THIS CONTACTS. IT DOES NOT ADVANCE THE ORDER. G8 first shipped the wa/brand treatment as a
// SKIN on the accept transition; G9's frame settles the reading — its `pending` specimen puts a
// WhatsApp Button under "Prochaine étape" with the helper "Confirmez la commande avec le client
// sur WhatsApp AVANT de préparer le colis". On COD you confirm before you accept, and conflating
// the two means a seller accepts an order they have never discussed. Both surfaces now render
// this button for contact and a separate control for the transition.
//
// Phone is revealed on click via get_contact_phone(target), never rendered into the page: the RPC
// is relationship-gated (it returns a number only to the two parties of a shared order OR — since
// PR-E — an annonce and its responder), so the reveal has to happen behind a user action, not at
// render.
export function WhatsAppContactButton({
  targetId,
  message,
  label,
  size = 'sm',
  errorMessageKey = 'seller.orders.whatsapp_error',
  noPhoneMessageKey = 'seller.orders.whatsapp_none',
}: {
  /** get_contact_phone's `target` — the other party's profile id (buyer, seller, or annonce responder). */
  targetId: string
  /** Fully composed, already localised. Truncated to the Arabic budget by buildWhatsAppUrl. */
  message: string
  label: string
  /** `sm` = G8's row (h-9). `lg` = G9's rail button (Figma 312×48). */
  size?: 'sm' | 'lg'
  /** Override for a non-order caller — the defaults read "…cette commande" (PR-E/AnnonceResponseCard). */
  errorMessageKey?: string
  noPhoneMessageKey?: string
}) {
  const supabase = createClient()
  const lang = useLang()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function contact() {
    setError(null)
    setLoading(true)
    const { data, error: rpcError } = await supabase.rpc('get_contact_phone', { target: targetId })
    setLoading(false)
    if (rpcError) {
      console.error('[whatsapp] phone reveal error:', rpcError.message, rpcError.code)
      setError(t(errorMessageKey, lang))
      return
    }
    if (!data) {
      setError(t(noPhoneMessageKey, lang))
      return
    }
    window.open(buildWhatsAppUrl(data as string, message), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={contact}
        disabled={loading}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[10px] bg-wa-brand font-semibold',
          'whitespace-nowrap transition-colors hover:brightness-95',
          'disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none',
          size === 'lg' ? 'h-12 w-full px-4 text-body' : 'h-9 px-4 text-body-sm',
          FOCUS_RING,
        )}
      >
        {/* ⚑ THE LABEL COLOUR LIVES HERE, ON ITS OWN ELEMENT, AND MUST STAY HERE.
            tailwind-merge treats every `text-*` utility as ONE group, so a colour and a size in
            the same merged string collide and the LATER one wins. When `text-text-primary` sat
            beside `text-body` in the button's own cn(), merge evicted the colour and the label
            rendered at the inherited rgb(237,237,237) on #25d366 — a measured 1.69:1, which is
            unreadable, not merely off-spec. The intended #0f172a on that green is 9.00:1.
            Splitting them across two elements makes the collision impossible rather than
            order-dependent: reordering the button's classes can no longer bring it back.
            This is the SECOND time the text-* group has silently evicted a class in this
            codebase — a size during the /marche/services rebuild, a colour here. */}
        <span className="text-text-primary">{label}</span>
      </button>
      {error ? (
        <p role="alert" className="text-caption text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  )
}
