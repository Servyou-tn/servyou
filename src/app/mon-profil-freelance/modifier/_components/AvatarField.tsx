'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { uploadAvatarAction, removeAvatarAction } from '@/app/mon-compte/actions'
import { MAX_INPUT_BYTES, MAX_INPUT_MB } from '@/lib/images/limits'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// Duplicated from mon-profil-freelance/creer/_components/AvatarField.tsx (route-local per this
// codebase's "promote at the third consumer" rule; H3 is the second) — identical pipeline
// (uploadAvatarAction/removeAvatarAction, mon-compte/actions.ts), immediate-on-pick, not deferred
// to the page's own Enregistrer submit. profiles.avatar_url has no ordering dependency here either.
export function AvatarField({ avatarUrl, fullName, lang }: { avatarUrl: string | null; fullName: string | null; lang: Lang }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function submit(file: File) {
    setError(null)
    if (file.size > MAX_INPUT_BYTES) {
      setError(t('monCompte.avatar.error.tooLarge', lang, { max: MAX_INPUT_MB }))
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    const formData = new FormData()
    formData.append('avatar', file)
    startTransition(async () => {
      const result = await uploadAvatarAction(formData)
      if (result.ok) router.refresh()
      else setError(result.error)
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await removeAvatarAction()
      if (result.ok) router.refresh()
      else setError(result.error)
    })
  }

  const helpId = 'h3-avatar-field-help'

  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        <Avatar size="2xl" src={avatarUrl} name={fullName ?? undefined} decorative={false} />
      ) : (
        <span aria-hidden="true" className="flex size-30 shrink-0 items-center justify-center rounded-full bg-surface-sunken">
          <Camera className="size-8 text-text-muted" />
        </span>
      )}

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" loading={pending} onClick={() => inputRef.current?.click()}>
            {avatarUrl ? t('monCompte.avatar.replace', lang) : t('freelance.create.avatar_choose', lang)}
          </Button>
          {avatarUrl ? (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={remove}>
              {t('monCompte.avatar.remove', lang)}
            </Button>
          ) : null}
        </div>
        <p id={helpId} className="text-sm text-text-secondary">
          {t('freelance.create.avatar_helper', lang)}
        </p>
        {pending ? (
          <p role="status" className="text-sm text-text-muted">
            {t('monCompte.avatar.uploading', lang)}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label={t('freelance.create.avatar_choose', lang)}
        aria-describedby={helpId}
        className={`sr-only ${FOCUS_RING}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) submit(file)
        }}
      />
    </div>
  )
}
