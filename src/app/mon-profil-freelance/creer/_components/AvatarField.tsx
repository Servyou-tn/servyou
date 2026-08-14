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

// H2 step 1's avatar field — Figma 466:20310 "field-avatar" (docs/design/h2-discovery.md §2b).
// Calls uploadAvatarAction/removeAvatarAction (mon-compte/actions.ts) DIRECTLY, immediately on
// pick — not deferred to form submit. Unlike G2's logo/banner (which need a real shopId before
// the storage policy's ownership check can pass), avatar targets profiles.avatar_url, which
// already exists the moment the user is authenticated: no ordering dependency on the
// freelancer_profiles insert this route's form performs. Same pipeline as /mon-compte's
// AvatarUploadCard — the Blob-not-Buffer fix and the post-upload size assertion (#122) live
// inside that action and normalizeAvatar, not reimplemented here.
//
// Layout is NOT AvatarUploadCard's `<section>` card — it is the frame's own
// circle+button+helper row, built fresh to match 466:20310's measured shape. The empty state is
// a camera glyph (the frame draws icon-camera in a 120px surface/sunken circle), not Avatar's
// generic person-fallback — Avatar itself is used only once a real image exists, reusing the
// same 2xl (120px) size mon-compte already established.
//
// `h-[100px]` on the frame's own field-avatar wrapper is not built — docs/design/h2-discovery.md
// flags it as a copy-paste artifact (a 120px circle inside a 100px overflow-clip box would
// visibly crop in the screenshot; it does not). This renders at its natural content height.
export function AvatarField({
  avatarUrl,
  fullName,
  lang,
}: {
  avatarUrl: string | null
  fullName: string | null
  lang: Lang
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function submit(file: File) {
    setError(null)

    // Checked here, before the request, for the same reason AvatarUploadCard checks it: a body
    // over the action's limit is rejected by the framework before our code runs and surfaces as
    // a crash page, not a message. The server keeps its own identical check (normalizeAvatar).
    if (file.size > MAX_INPUT_BYTES) {
      setError(t('monCompte.avatar.error.tooLarge', lang, { max: MAX_INPUT_MB }))
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const formData = new FormData()
    formData.append('avatar', file)
    startTransition(async () => {
      const result = await uploadAvatarAction(formData)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error)
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await removeAvatarAction()
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  const helpId = 'avatar-field-help'

  return (
    <div className="flex items-center gap-4">
      {avatarUrl ? (
        <Avatar size="2xl" src={avatarUrl} name={fullName ?? undefined} decorative={false} />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-30 shrink-0 items-center justify-center rounded-full bg-surface-sunken"
        >
          <Camera className="size-8 text-text-muted" />
        </span>
      )}

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={pending}
            onClick={() => inputRef.current?.click()}
          >
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

      {/* HEIC deliberately absent from accept — same reasoning as AvatarUploadCard. */}
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
