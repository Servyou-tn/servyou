import { User } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { t, type Lang } from '@/lib/i18n'
import { localizeCity } from '@/lib/marche/missions'

// client-card — Figma 323:11873 (docs/design/h9-h13-measurements.md §2.1): surface/base, 1 px border/subtle,
// radius xl, pad 20, gap 12. « Publié par », a 40 px avatar (initial on blue/100), first name Semi Bold 16,
// then icon-user + « Ville · Consommateur » Medium 14 muted.
//
// Name and city only — public_profiles never carries a phone/email. Phone reveal rule (2026-11-01): a freelancer NEVER gets the client's number through a
// proposal (the client contacts them if they retain it), so there is no contact control here or in the recap. Shared by H10 and the H12 recap.
export function ClientCard({
  firstName,
  city,
  avatarUrl,
  lang,
}: {
  firstName: string
  city: string | null
  avatarUrl: string | null
  lang: Lang
}) {
  const name = firstName || t('missioncard.client_unknown', lang)
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-base p-5">
      <h2 className="text-caption font-medium text-text-muted">{t('missiondetail.published_by', lang)}</h2>
      <div className="flex items-center gap-3">
        <Avatar size="md" src={avatarUrl} name={name} initials={firstName.charAt(0).toLocaleUpperCase()} />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-h4 text-text-primary">{name}</p>
          <p className="flex items-center gap-1 text-body-sm font-medium text-text-muted">
            <User className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {localizeCity(city, lang) ? `${localizeCity(city, lang)} · ` : ''}
              {t('missiondetail.client_role', lang)}
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
