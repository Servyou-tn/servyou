import { t, type Lang } from '@/lib/i18n'

// The page-level header block of the mobile Marketplace frames (m375-marche-services / m375-marche-freelances, Figma 621:49740 family): « Marketplace »
// (20 SemiBold) over a 41 high sunken search field (r10, pad 12, 14 text, no icon), on a surface/base block with pad 16, gap 12 and a bottom
// hairline. Page content, not shell: it bleeds to the screen edges through the shell's main padding (-mx-4 -mt-6) and is below `lg` only (the sidebar
// names the page from there). A plain GET form, so it works without JS: submitting sets `q` and drops `page`; every other active param rides along
// as a hidden field.
export function MarketplaceMobileHeader({
  lang,
  action,
  q,
  placeholderKey,
  keep,
}: {
  lang: Lang
  /** The lens route the search submits to (a GET: `?q=…`). */
  action: string
  q: string
  placeholderKey: string
  /** The other active URL params (vue, categorie, ville, prix_min, prix_max, tri) — kept across a new search. */
  keep: Record<string, string>
}) {
  const placeholder = t(placeholderKey, lang)
  return (
    <div className="-mx-4 -mt-6 flex flex-col gap-3 border-b border-border-subtle bg-surface-base p-4 pb-[15px] md:-mx-8 md:-mt-8 lg:hidden">
      <h1 className="text-[20px] font-semibold leading-6 text-text-primary">{t('shell.sidebar.marketplace', lang)}</h1>
      <form action={action} method="get" role="search">
        {Object.entries(keep)
          .filter(([name]) => name !== 'q' && name !== 'page')
          .map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        <input
          key={q}
          type="search"
          enterKeyHint="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-[41px] w-full rounded-[10px] bg-surface-sunken px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-brand-blue-600"
        />
      </form>
    </div>
  )
}
