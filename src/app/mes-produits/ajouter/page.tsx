import type { Metadata } from 'next'
import { randomUUID } from 'node:crypto'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ProductForm } from '@/components/produits/ProductForm'
import { requireShopOwner } from '@/lib/auth/require-seller'
import { getProductCategories } from '@/lib/marche/product-categories'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Ajouter un produit — Servyou' }

const ROUTE = '/mes-produits/ajouter'

// G6 « Ajouter un produit » — Figma 530:31784.
//
// Ships STANDALONE: G5 /mes-produits does not exist yet, so this route is reached from G4's action
// centre and returns to the dashboard. `product.back` ("Retour aux produits") still points at the
// absent /mes-produits and is deliberately not used here.
//
// ⚑ THE PRODUCT UUID IS MINTED HERE, per request, and handed to the form.
// It cannot be generated at insert time (`gen_random_uuid()`) because images upload to
// `{shop_id}/{productId}/…` BEFORE any row exists — `product_images.product_id` is NOT NULL and its
// INSERT policy requires the product, but a STORAGE path requires nothing. That inversion is what
// makes the designed upload-then-submit flow possible at all. See docs/design/g6-write-path.md §4a.
//
// An abandoned form therefore leaves orphaned objects under a productId that never becomes a row.
// That is the accepted residue; the reconciliation sweep (image-storage-discovery.md §6c) is logged
// and this PR is its trigger.

export default async function AjouterProduitPage() {
  // Redirects a logged-out visitor to /connexion?next=… and a non-shop-owner to /devenir-vendeur.
  const { topBarUser, shop } = await requireShopOwner(ROUTE)
  const lang = await getLang()

  // A shop_owner who never completed G2. Not a crash, and not a redirect — G2 is unbuilt, so there
  // is nowhere honest to send them. Render the state instead.
  if (!shop) {
    return (
      <AppShell user={topBarUser}>
        <PageIntro lang={lang} />
        <p className="max-w-[760px] rounded-2xl bg-white p-6 text-sm text-text-muted">
          {t('product.error.noShop', lang)}
        </p>
      </AppShell>
    )
  }

  const categories = await getProductCategories()

  return (
    <AppShell user={topBarUser}>
      <PageIntro lang={lang} />
      <ProductForm productId={randomUUID()} categories={categories} />
    </AppShell>
  )
}

// Breadcrumb + plain title + subtitle.
//
// ⚑ NOT `PageHeader`. That component documents itself as the "premium animated subtitle row for the
// CONSUMER DASHBOARD SHELL" — it splits the string into per-character reveal spans, colours an
// emphasis word, draws an underline and wraps the lot in a bordered panel. Correct for /marche,
// wrong for a seller form, and the source of three separate fidelity deltas at once (g6-deltas.md
// D2). A form wants a title, not a performance.
//
// ⚑ "Mes produits" is PLAIN TEXT, not a link. G5 `/mes-produits` does not exist — the directory
// holds only `ajouter/` — and the sidebar entry is already `disabled: true`. The trail still tells
// the seller where they are, which is the job; a link would be the part that is dead. It becomes a
// real link in the G5 PR (logged in docs/follow-ups.md).
function PageIntro({ lang }: { lang: Awaited<ReturnType<typeof getLang>> }) {
  return (
    <div className="mb-8 max-w-[760px]">
      <nav aria-label="Fil d'Ariane" className="mb-3">
        <ol className="flex items-center gap-1.5 text-sm text-text-muted">
          <li>{t('product.form.crumb_products', lang)}</li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </li>
          <li aria-current="page" className="font-medium text-text-primary">
            {t('product.form.crumb_current', lang)}
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-text-primary">{t('product.form.page_title', lang)}</h1>
      <p className="mt-1.5 text-sm text-text-muted">{t('product.form.page_subtitle', lang)}</p>
    </div>
  )
}
