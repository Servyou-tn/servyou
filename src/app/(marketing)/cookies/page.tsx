import type { Metadata } from 'next'
import { publicMetadata } from '@/lib/seo/metadata'
import { getLang } from '@/lib/i18n/server'
import { LegalPageShell } from '@/components/legal/LegalPageShell'
import { LEGAL_DOCS } from '@/lib/legal/legal-structure'

export async function generateMetadata(): Promise<Metadata> {
  return publicMetadata('meta.cookies', 'seo.desc.cookies', '/cookies')
}

export default async function CookiesPage() {
  const lang = await getLang()
  return <LegalPageShell doc={LEGAL_DOCS.cookies} lang={lang} />
}
