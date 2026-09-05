'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

// D4's « Partager » — badge cut, button kept (founder ruling: the "3" badge on the measured
// specimen has no counting mechanism anywhere in the schema, read as copy-paste residue from the
// "Demander un service" specimen's live listing-count badge). Same plain copy-link pattern as
// ShopShareButton/ShareLinkButton — this is the THIRD consumer of that pattern; per the project's
// own promote-at-the-third-consumer rule this is a candidate for src/components/ui, flagged in the
// PR description rather than promoted unasked.
export function FreelancerShareButton() {
  const lang = useLang()
  const [busy, setBusy] = useState(false)

  async function copy() {
    const url = window.location.href
    setBusy(true)
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('freelance.public.link_copied', lang))
    } catch {
      toast.error(t('common.error_generic', lang))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={copy} loading={busy}>
      {t('freelance.public.share', lang)}
    </Button>
  )
}
