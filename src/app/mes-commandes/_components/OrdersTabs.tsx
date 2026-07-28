import { Package, Briefcase } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

// The Produits · Services toggle (Figma segmented 709:59668 / 710:59947).
//
// Figma authors Produits FIRST and selected (`selected=0` on the Produits frames, `selected=1`
// on the Services ones — the prop is 0-based). Only the Services tab is built, so the designed
// default would land the page on nothing. Founder call: Services is the default and Produits
// renders DISABLED with the same "Bientôt" badge the /marche/services lens toggle already uses,
// so the two deferred-tab affordances look the same. Produits keeps its first position — the
// order is the design's, only the selection moved.
//
// Static markup, no client interaction, so this stays a server component: the tab is not a
// client control but a URL fact (?tab=services), and ?tab=produits falls back to services
// rather than 404-ing.
export function OrdersTabs({ lang }: { lang: Lang }) {
  return (
    <div
      role="tablist"
      aria-label={t('mesCommandes.tabsAria', lang)}
      className="inline-flex items-center self-start rounded-[10px] bg-surface-pill p-1"
    >
      <button
        type="button"
        role="tab"
        disabled
        aria-disabled="true"
        aria-selected={false}
        title={t('mesCommandes.tab.soon', lang)}
        className="inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-md px-3 text-body-sm font-medium text-text-secondary"
      >
        <Package className="h-4 w-4" aria-hidden="true" />
        {t('mesCommandes.tab.produits', lang)}
        <span className="rounded-full bg-brand-blue-100 px-1.5 py-0.5 text-caption font-semibold text-brand-blue-600">
          {t('mesCommandes.tab.soon', lang)}
        </span>
      </button>
      <span
        role="tab"
        aria-selected
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-body-sm font-medium text-text-primary shadow-sm"
      >
        <Briefcase className="h-4 w-4" aria-hidden="true" />
        {t('mesCommandes.tab.services', lang)}
      </span>
    </div>
  )
}
