import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { isUuid } from '@/lib/admin/action-input'
import { loadDisputesView } from '../_lib/load'
import { DisputesView } from '../_components/DisputesView'

type Props = { params: Promise<{ id: string }> }

// J7 with this dispute selected: the same screen as /admin/litiges, on the dispute's own status tab.
export default async function DisputeDetailPage({ params }: Props) {
  const { id } = await params
  await requireAdmin(`/admin/litiges/${id}`)
  const lang = await getLang()
  const supabase = await createClient()
  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request), the admin/statistiques precedent.
  const now = Date.now()
  const view = isUuid(id) ? await loadDisputesView(supabase, lang, { tabParam: 'open', selectedId: id, now }) : { notFound: true as const }

  if ('notFound' in view) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-body-sm text-text-secondary">{t('admin.disputes.error_not_found', lang)}</p>
        <Link href="/admin/litiges" className="self-start text-body-sm font-medium text-brand-indigo-600 hover:underline">
          {t('admin.disputes.back_to_queue', lang)}
        </Link>
      </div>
    )
  }
  return <DisputesView lang={lang} {...view} />
}
