import type { Metadata } from 'next'
import { localizedMetadata } from '@/lib/i18n/metadata'
import { getLang } from '@/lib/i18n/server'
import { LegalPageShell } from '@/components/legal/LegalPageShell'
import { LEGAL_DOCS } from '@/lib/legal/legal-structure'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('meta.privacy')
}

export default async function ConfidentialitePage() {
  const lang = await getLang()
  return <LegalPageShell doc={LEGAL_DOCS.confidentialite} lang={lang} />
}
