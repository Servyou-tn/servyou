import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { AuthFunnelLayout } from '@/components/auth/AuthFunnelLayout'
import { getProductDetail } from '@/lib/marche/product-detail'
import { getServiceDetail } from '@/lib/marche/service-detail'
import { demanderTargetId, readNext, withNext } from '@/lib/auth/next-param'
import { SigninForm } from './components/SigninForm'

// /connexion — the sign-in page. Inherits the navy AuthShell chrome via
// AuthFunnelLayout (title on white, navy box, footer on white). Narrower box than
// signup (480px) since it is only two fields. Replaces the legacy /login, which
// stays live until Commit 5 repoints references and Commit 6 deletes the file.
//
// Walk 2026-11-02 #7–#9: the wordmark (→ home) is always there; when a guard sent the visitor here from the request form
// (?next=/demander/{id}) the page says why (« Connectez-vous pour demander ce produit ») and links back to the listing; and
// « Créer un compte » keeps ?next= so a NEW visitor lands back on the order too (SigninForm already honours it after a sign-in).

type Context = { notice: string; back?: { href: string; label: string } }

// The listing behind /demander/{id}, through the PUBLIC loaders the visitor's own product / service page used (the request form's
// getRequestTarget is the signed-in loader: a guest reads no service row through it). A failed or empty lookup must never block a
// sign-in: it falls back to the generic line.
async function demanderContext(next: string | null, lang: Lang): Promise<Context | null> {
  const id = demanderTargetId(next)
  if (!id) return null
  try {
    if (await getProductDetail(id)) {
      return { notice: t('signin.reason.product', lang), back: { href: `/produits/${id}`, label: t('auth.back.product', lang) } }
    }
    if (await getServiceDetail(id)) {
      return { notice: t('signin.reason.service', lang), back: { href: `/services/${id}`, label: t('auth.back.service', lang) } }
    }
  } catch {
    // reported by the loader; the generic line below still explains the page
  }
  return { notice: t('signin.reason.request', lang) }
}

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const lang = await getLang()
  const sp = await searchParams
  const next = readNext(sp.next)
  const context = await demanderContext(next, lang)
  return (
    <AuthFunnelLayout
      maxWidthClass="max-w-[480px]"
      title={t('signin.title', lang)}
      subtitle={t('signin.subtitle', lang)}
      homeBar
      homeLabel={t('auth.home', lang)}
      back={context?.back}
      notice={context?.notice}
      footer={
        <>
          {t('signin.noAccount', lang)}{' '}
          <Link href={withNext('/inscription', next)} className="font-semibold text-[var(--brand-blue-600)] hover:underline">
            {t('signin.signupLink', lang)}
          </Link>
        </>
      }
    >
      <SigninForm showResetSuccess={sp.passwordReset === 'success'} />
    </AuthFunnelLayout>
  )
}
