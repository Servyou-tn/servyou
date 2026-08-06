'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { uploadProductImageAction } from '@/app/actions/products'
import { MAX_PRODUCT_IMAGES } from '@/lib/products/constants'
import { MAX_INPUT_BYTES, MAX_INPUT_MB } from '@/lib/images/limits'

// The G6 gallery. Four affordances were designed; THREE ship here:
//   ✅ remove          ✅ cover badge          ✅ per-file progress
//   ⏸ drag-reorder — deferred to G7. `product_images` has no UPDATE policy (INSERT/SELECT/DELETE
//      only), so reordering is delete+reinsert, and the place that actually needs it is editing an
//      existing gallery. Insert order is gallery order: the first upload is the cover.
//
// ⚑ ONE FILE PER SERVER-ACTION CALL, and that is not a style choice. Vercel caps a function's whole
// request payload at 4.5 MB; the gallery takes 8 images and two phone photos already exceed it. Each
// tile owns its own request, its own progress and its own error — which is also why one failure
// does not disturb the tiles that succeeded.
//
// Uploads happen BEFORE the product row exists (the uuid is generated server-side up front), so a
// failure here leaves orphaned objects and no product. See docs/design/g6-write-path.md §4b.

export type UploadedImage = { path: string; url: string }

type Tile =
  | { state: 'uploading'; key: string; preview: string }
  | { state: 'done'; key: string; image: UploadedImage }
  | { state: 'error'; key: string; message: string }

export function ImageUploadGrid({
  productId,
  onChange,
}: {
  productId: string
  onChange: (images: UploadedImage[]) => void
}) {
  const lang = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [tiles, setTiles] = useState<Tile[]>([])

  const doneCount = tiles.filter((x) => x.state === 'done').length
  const atMax = doneCount + tiles.filter((x) => x.state === 'uploading').length >= MAX_PRODUCT_IMAGES

  // Recomputed from the tile list on every mutation so the parent's ordering always matches what
  // the seller sees. Derived, never a second source of truth.
  function publish(next: Tile[]) {
    setTiles(next)
    onChange(next.flatMap((x) => (x.state === 'done' ? [x.image] : [])))
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const room = MAX_PRODUCT_IMAGES - (doneCount + tiles.filter((x) => x.state === 'uploading').length)
    const accepted = Array.from(files).slice(0, Math.max(0, room))

    for (const file of accepted) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`

      // Rejected before the request is even sent — MAX_INPUT_BYTES lives in limits.ts precisely so
      // the client can do this without importing sharp.
      if (file.size > MAX_INPUT_BYTES) {
        setTiles((prev) => [
          ...prev,
          { state: 'error', key, message: t('product.image.error.tooLarge', lang, { max: MAX_INPUT_MB }) },
        ])
        continue
      }

      const preview = URL.createObjectURL(file)
      setTiles((prev) => [...prev, { state: 'uploading', key, preview }])

      const fd = new FormData()
      fd.append('productId', productId)
      fd.append('image', file)

      const res = await uploadProductImageAction(fd)
      URL.revokeObjectURL(preview)

      setTiles((prev) => {
        const next = prev.map((x): Tile =>
          x.key === key
            ? res.ok
              ? { state: 'done', key, image: { path: res.path, url: res.url } }
              : { state: 'error', key, message: res.error }
            : x,
        )
        onChange(next.flatMap((x) => (x.state === 'done' ? [x.image] : [])))
        return next
      })
    }

    // Let the same file be picked again after a removal.
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(key: string) {
    publish(tiles.filter((x) => x.key !== key))
  }

  const tileBase =
    'relative aspect-square overflow-hidden rounded-xl border border-border-subtle bg-surface-pill'

  return (
    <div>
      <p className="mb-3 text-sm text-text-muted">
        {t('product.form.images_hint', lang, { max: MAX_PRODUCT_IMAGES })}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile, i) => (
          <div key={tile.key} className={tileBase}>
            {tile.state === 'uploading' && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview, discarded on upload */}
                <img src={tile.preview} alt="" className="h-full w-full object-cover opacity-40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <Loader2 className="h-5 w-5 animate-spin text-brand-blue-600" aria-hidden />
                  <span className="text-xs text-text-muted">{t('product.form.images_uploading', lang)}</span>
                </div>
              </>
            )}

            {tile.state === 'done' && (
              <>
                <Image
                  src={tile.image.url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                />
                {/* Cover badge: insert order IS gallery order, so the first done tile is the cover. */}
                {i === tiles.findIndex((x) => x.state === 'done') && (
                  <span className="absolute start-2 top-2 rounded-full bg-brand-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                    {t('product.form.images_cover', lang)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(tile.key)}
                  aria-label={t('product.form.images_remove', lang)}
                  className={`absolute end-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 ${FOCUS_RING}`}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </>
            )}

            {tile.state === 'error' && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center">
                <p className="text-xs text-red-700">{tile.message}</p>
                <button
                  type="button"
                  onClick={() => remove(tile.key)}
                  className={`rounded-full px-2 py-1 text-xs font-medium text-text-muted hover:bg-white ${FOCUS_RING}`}
                >
                  {t('product.form.images_remove', lang)}
                </button>
              </div>
            )}
          </div>
        ))}

        {!atMax && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`${tileBase} flex flex-col items-center justify-center gap-2 border-dashed text-text-muted transition-colors hover:border-brand-blue-600 hover:text-brand-blue-600 ${FOCUS_RING}`}
          >
            <ImagePlus className="h-6 w-6" aria-hidden />
            <span className="text-xs font-medium">{t('product.form.images_add', lang)}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  )
}
