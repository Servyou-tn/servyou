'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// D3's « Partager » — same shape and same reason as ProductDetail.tsx's ShareLinkButton: copies
// the current URL rather than opening the full share dialog drawn at 543:33852 (Facebook /
// Instagram / WhatsApp / Copier rows). That dialog needs icon-share plus three brand glyphs that
// do not exist in the Figma file — D1 already declined to build it for the identical reason.
// Building it once for D3 alone would diverge from D1's own precedent rather than follow it.
//
// Route-local, not promoted to shared/ui: this is the SECOND consumer of the copy-link pattern
// (D1 is the first), and the project's own rule is promote at the third.
export function ShopShareButton() {
  const lang = useLang()
  const [busy, setBusy] = useState(false)

  async function copy() {
    const url = window.location.href
    setBusy(true)
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('boutique.public.link_copied', lang))
    } catch {
      toast.error(t('common.error_generic', lang))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={copy} loading={busy}>
      {t('boutique.public.share', lang)}
    </Button>
  )
}
