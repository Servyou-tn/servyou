import type { Metadata } from 'next'
import { publicMetadata } from '@/lib/seo/metadata'
import { getLang } from '@/lib/i18n/server'
import { LegalPageShell } from '@/components/legal/LegalPageShell'
import { LEGAL_DOCS } from '@/lib/legal/legal-structure'

export async function generateMetadata(): Promise<Metadata> {
  return publicMetadata('meta.terms', 'seo.desc.terms', '/conditions')
}

export default async function ConditionsPage() {
  const lang = await getLang()
  return <LegalPageShell doc={LEGAL_DOCS.conditions} lang={lang} />
}
