import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

// TODO: placeholder. Step 2 — the role-branded "Vendre" signup form — replaces
// this in the next sprint.
export default async function ShopOwnerStep2Placeholder() {
  const lang = await getLang()
  const role = t('signup.intent.cards.shopOwner.label', lang)
  const step = lang === 'ar' ? 'الخطوة 2' : 'Étape 2'
  const soon = lang === 'ar' ? 'هذه الصفحة قيد الإنشاء.' : 'Cette page est en construction.'
  const back = lang === 'ar' ? 'العودة' : 'Retour'

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--surface-base)] p-6 text-center"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-accent)]">{role}</p>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">{`Servyou — ${step}`}</h1>
      <p className="text-[var(--text-muted)]">{soon}</p>
      <Link href="/inscription" className="mt-2 font-semibold text-[var(--brand-accent)] hover:underline">
        {back}
      </Link>
    </main>
  )
}
