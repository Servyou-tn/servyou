import type { Metadata } from 'next'
import { getLang } from '@/lib/i18n/server'
import { LegalPageShell } from '@/components/legal/LegalPageShell'
import { LEGAL_DOCS } from '@/lib/legal/legal-structure'

export const metadata: Metadata = { title: "Conditions Générales d'Utilisation — Servyou" }

export default async function ConditionsPage() {
  const lang = await getLang()
  return <LegalPageShell doc={LEGAL_DOCS.conditions} lang={lang} />
}
