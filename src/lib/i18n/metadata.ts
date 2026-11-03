import type { Metadata } from 'next'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n/server'

// Tab titles in the viewer's language (walk 2026-11-02 #28: « Produits — Servyou », « Tableau de bord — Servyou » stayed French on
// Arabic pages). A page's generateMetadata returns localizedMetadata('meta.<page>'): « {title} — Servyou », the FR values unchanged.
// `descriptionKey` localizes the meta description the same way; `extra` carries the rest (robots…).
export async function localizedMetadata(titleKey: string, extra: Metadata = {}, descriptionKey?: string): Promise<Metadata> {
  const lang = await getLang()
  return {
    ...extra,
    title: `${t(titleKey, lang)} — Servyou`,
    ...(descriptionKey ? { description: t(descriptionKey, lang) } : {}),
  }
}
