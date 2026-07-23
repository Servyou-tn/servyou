'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// Email as a mailto link + a copy-to-clipboard button (shows a check for ~1.5s on copy).
export function CopyableEmail({ email }: { email: string }) {
  const lang = useLang()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (insecure context / permissions) — the mailto link still works.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={`mailto:${email}`}
        className={`rounded text-sm font-medium text-brand-accent hover:underline ${FOCUS_RING}`}
      >
        {email}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? t('contact.methods.email.copied', lang) : email}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 ${FOCUS_RING}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4 text-text-muted" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
