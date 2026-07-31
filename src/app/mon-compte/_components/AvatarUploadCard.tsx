'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { uploadAvatarAction, removeAvatarAction } from '@/app/mon-compte/actions'
import { MAX_INPUT_BYTES, MAX_INPUT_MB } from '@/lib/images/limits'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// Avatar upload for /mon-compte — the ONE consumer that ships with the storage foundation.
//
// ⚑ No Figma frame drives this component. I1 (724:63872) designs the full /mon-compte page and is
// a later PR; the only avatar affordance it specifies is the label "Modifier la photo"
// ('monCompte.photo.change', which already existed in fr.ts). So this is a deliberately plain card
// built from existing primitives — Avatar at `2xl` (120px, the measured Figma size) plus the F3
// Button — rather than an invented layout that I1 would then have to undo. When I1 lands, this
// control moves into its identity panel; the action and the storage path do not change.
//
// The file input is visually hidden but NOT display:none — a hidden-but-focusable input keeps the
// control keyboard-reachable and lets the label stay the visible affordance.
export function AvatarUploadCard({
  avatarUrl,
  fullName,
  lang,
}: {
  avatarUrl: string | null
  fullName: string | null
  lang: Lang
}) {
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function submit(file: File) {
    setError(null)
    setNotice(null)

    // Size is checked HERE, before the request, because the server action cannot report this one.
    // A body over the action's limit is rejected by the framework before any of our code runs, so
    // it surfaces as a 500 through the error boundary — a crash page instead of a message. Checking
    // client-side keeps the honest FR/AR string and costs nothing. The server keeps its own
    // identical check (normalizeAvatar) since a client check is never a gate.
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
        setNotice(t('monCompte.avatar.saved', lang))
        router.refresh()
      } else {
        setError(result.error)
      }
      // Always clear the input: without this, re-picking the SAME file after a failure fires no
      // change event and the retry silently does nothing.
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  function remove() {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await removeAvatarAction()
      if (result.ok) {
        setNotice(t('monCompte.avatar.removed', lang))
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  const helpId = 'avatar-help'

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border-subtle bg-surface-base p-6">
      <h2 className="text-h4 font-semibold text-text-primary">{t('monCompte.avatar.title', lang)}</h2>

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {/* decorative={false}: this avatar is the sole identity cue in the card — there is no
            adjacent visible name for it to duplicate — so it is exposed with an accessible label. */}
        <Avatar size="2xl" src={avatarUrl} name={fullName ?? undefined} decorative={false} />

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="md"
              variant="secondary"
              loading={pending}
              onClick={() => inputRef.current?.click()}
            >
              {avatarUrl ? t('monCompte.avatar.replace', lang) : t('monCompte.avatar.choose', lang)}
            </Button>

            {avatarUrl ? (
              <Button type="button" size="md" variant="ghost" disabled={pending} onClick={remove}>
                {t('monCompte.avatar.remove', lang)}
              </Button>
            ) : null}
          </div>

          <p id={helpId} className="text-body-sm text-text-muted">
            {t('monCompte.avatar.help', lang)}
          </p>
        </div>
      </div>

      {/* HEIC is deliberately ABSENT from accept: iOS offers HEIC files under an image/* filter
          anyway, and listing it here would imply support we do not have. The server returns the
          specific iOS-setting message when one arrives. */}
      <input
        ref={inputRef}
        type="file"
        name="avatar"
        accept="image/jpeg,image/png,image/webp,image/avif"
        aria-label={t('monCompte.avatar.choose', lang)}
        aria-describedby={helpId}
        className={`sr-only ${FOCUS_RING}`}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) submit(file)
        }}
      />

      {pending ? (
        <p role="status" className="text-body-sm text-text-muted">
          {t('monCompte.avatar.uploading', lang)}
        </p>
      ) : null}

      {notice && !pending ? (
        <p role="status" className="text-body-sm text-success-700">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-body-sm text-danger-500">
          {error}
        </p>
      ) : null}
    </section>
  )
}
