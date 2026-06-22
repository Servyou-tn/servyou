import type { Metadata } from 'next'
import { getLang } from '@/lib/i18n/server'
import { LegalPageShell } from '@/components/legal/LegalPageShell'
import { LEGAL_DOCS } from '@/lib/legal/legal-structure'

export const metadata: Metadata = { title: 'Politique de cookies — Servyou' }

export default async function CookiesPage() {
  const lang = await getLang()
  return <LegalPageShell doc={LEGAL_DOCS.cookies} lang={lang} />
}
