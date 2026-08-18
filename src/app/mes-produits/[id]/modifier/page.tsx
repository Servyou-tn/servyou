import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { requireShopOwner } from '@/lib/auth/require-seller'
import { getProductCategories } from '@/lib/marche/product-categories'
import { getSellerProductDetail } from '@/lib/marche/seller-products-query'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { EditProductForm } from './_components/EditProductForm'

export const metadata: Metadata = { title: 'Modifier le produit — Servyou' }

const LIST = '/mes-produits'

// G7 « Modifier un produit » — Figma 535:32433 (form) + 536:32793/536:32841 (§5 states) +
// 536:32818 (delete modal). Full reasoning: the G7 discovery report (this session, no separate
// doc — see the build's own commit body for the rulings it implements).

export default async function ModifierProduitPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const lang = await getLang()
  const { topBarUser, shop } = await requireShopOwner(`${LIST}/${id}/modifier`)

  // A shop_owner who never completed G2 cannot own a product either — this route is unreachable
  // for them in practice, but if it is ever hit directly, 404 rather than crashing on a null shop.
  if (!shop) notFound()

  const [product, categories] = await Promise.all([
    getSellerProductDetail(shop.id, id),
    getProductCategories(),
  ])

  // Missing id, invalid id, or a product this shop doesn't own — one indistinguishable 404, so the
  // response can't be used to probe whether a product id exists (same convention as G9's order
  // detail page).
  if (!product) notFound()

  return (
    <AppShell user={topBarUser}>
      <div className="mb-3 max-w-[760px]">
        <nav aria-label="Fil d'Ariane">
          <ol className="flex items-center gap-1.5 text-sm text-text-muted">
            <li>
              <Link href={LIST} className={cn('rounded hover:text-text-primary hover:underline', FOCUS_RING)}>
                {t('product.form.crumb_products', lang)}
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </li>
            <li aria-current="page" className="font-medium text-text-primary">
              {t('product.edit.crumb_current', lang)}
            </li>
          </ol>
        </nav>
      </div>

      {/* H1 + StatusPill + "Voir le produit" live in EditProductForm, not here — they track the
          §5 status toggle in real time (same reasoning as the footer's own view-link), which a
          plain server-rendered header block can't do. */}
      <EditProductForm product={product} categories={categories} />
    </AppShell>
  )
}
