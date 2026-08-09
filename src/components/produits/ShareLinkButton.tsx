'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { FOCUS_RING } from '@/components/layout/styles'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// D1's « Partager » control — `562:39242` in the measured secondaryRow.
//
// ⚑ THIS COPIES THE LINK. IT DOES NOT OPEN THE SHARE DIALOG. Specimen `563:39668` draws a full
// dialog (Facebook / Instagram / WhatsApp / Copier) and it is deliberately NOT built here: it needs
// `icon-share` plus three brand glyphs, and `icon-share` does not exist in the Figma file yet (the
// D1 build shipped both this and « Signaler » with no glyph for the same reason). Authoring four
// icons is its own PR. The i18n already anticipated this shape — `product.detail.link_copied` has
// existed in fr.ts and ar.ts since before the route was rebuilt.
//
// ⚑ AND IT IS NOT D2's SHARE. `ServiceDetail.tsx:91-99` renders its share control as a <Link> whose
// href is the page you are already standing on, labelled "Copier le lien" — an inert affordance
// that copies nothing. That is logged in docs/follow-ups.md as its own fix; it is not a pattern to
// reproduce, and D2 is not touched by this PR.
//
// Text-only, no glyph, matching the frame: the row is « ♡ Enregistrer » then « Partager » at gap 24.

export function ShareLinkButton() {
  const lang = useLang()
  const [busy, setBusy] = useState(false)

  async function copy() {
    // `window.location.href` rather than a rebuilt `/produits/${id}`: it carries the origin, so what
    // lands on the clipboard is a link someone can actually paste into WhatsApp. The id is a bare
    // uuid — there is no slug on `products` — so there is nothing prettier to construct.
    const url = window.location.href
    setBusy(true)
    try {
      // Requires a secure context. localhost and the production https origin both qualify; a plain
      // http preview does not, which is the case the catch below is for.
      await navigator.clipboard.writeText(url)
      toast.success(t('product.detail.link_copied', lang))
    } catch {
      // No silent failure — a copy button that does nothing and says nothing is worse than one that
      // admits it. The generic key already exists in both locales.
      toast.error(t('common.error_generic', lang))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={busy}
      className={`rounded-md text-base font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-60 ${FOCUS_RING}`}
    >
      {t('product.detail.share', lang)}
    </button>
  )
}
