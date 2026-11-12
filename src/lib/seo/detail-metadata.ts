import type { Metadata } from 'next'
import { t, type Lang } from '@/lib/i18n'
import { localizeCity } from '@/lib/marche/missions'
import { buildPublicMetadata, titleWithPart } from './metadata'

// Search / share metadata of the four public detail pages (audit checklist 5), from the page's real data: the
// freelancer's name + headline, the shop's name + city, the product's and the service's name. Pure — the pages pass
// what their cached loader already fetched (no extra query), and a missing row never reaches here (404, noindex).

export function freelancerMetadata(
  f: { id: string; fullName: string; headline: string | null; city: string | null },
  lang: Lang,
): Metadata {
  const city = localizeCity(f.city, lang)
  const title = titleWithPart(f.fullName, f.headline)
  const description = city
    ? t('seo.desc.freelancer_city', lang, { name: f.fullName, city })
    : t('seo.desc.freelancer', lang, { name: f.fullName })
  return buildPublicMetadata({ title, description, path: `/freelance/${f.id}`, lang })
}

export function shopMetadata(s: { id: string; name: string; city: string | null }, lang: Lang): Metadata {
  const city = localizeCity(s.city, lang)
  const title = titleWithPart(s.name, city)
  const description = city ? t('seo.desc.shop_city', lang, { name: s.name, city }) : t('seo.desc.shop', lang, { name: s.name })
  return buildPublicMetadata({ title, description, path: `/boutique/${s.id}`, lang })
}

export function productMetadata(p: { id: string; title: string; shop: { name: string } | null }, lang: Lang): Metadata {
  const shop = p.shop?.name?.trim()
  const description = shop
    ? t('seo.desc.product_shop', lang, { title: p.title, shop })
    : t('seo.desc.product', lang, { title: p.title })
  return buildPublicMetadata({ title: p.title, description, path: `/produits/${p.id}`, lang })
}

export function serviceMetadata(s: { id: string; title: string; freelancer: { name: string } | null }, lang: Lang): Metadata {
  const name = s.freelancer?.name?.trim()
  const description = name
    ? t('seo.desc.service_freelancer', lang, { title: s.title, name })
    : t('seo.desc.service', lang, { title: s.title })
  return buildPublicMetadata({ title: s.title, description, path: `/services/${s.id}`, lang })
}
