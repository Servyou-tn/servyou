import type { Metadata } from 'next'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n/server'

// Tab titles in the viewer's language (walk 2026-11-02 #28: « Produits — Servyou », « Tableau de bord — Servyou » stayed French on
// Arabic pages). A page's generateMetadata returns localizedMetadata('meta.<page>'): the bare title — the root layout's template
// adds « · ServYou » (audit checklist 5). `descriptionKey` localizes the meta description the same way; `extra` carries the rest.
// These pages stay NOINDEX (the root default); a public page uses publicMetadata() from src/lib/seo/metadata.ts instead.
export async function localizedMetadata(titleKey: string, extra: Metadata = {}, descriptionKey?: string): Promise<Metadata> {
  const lang = await getLang()
  return {
    ...extra,
    title: t(titleKey, lang),
    ...(descriptionKey ? { description: t(descriptionKey, lang) } : {}),
  }
}
