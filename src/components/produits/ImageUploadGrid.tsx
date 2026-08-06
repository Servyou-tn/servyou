'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Loader2, UploadCloud } from 'lucide-react'
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
// ⚑ TWO STATES, not one (g6-deltas.md D6). The frame shows a FULL-WIDTH dashed dropzone while the
// gallery is empty (`197:14957`, upload-cloud); the 96px thumb grid plus a dashed "+Ajouter" tile
// is the FILLED state (specimen `532:32201`). The first build collapsed both into a single grid
// whose first cell was an add-tile, so the empty state never showed a dropzone at all.
//
// Thumbs are a fixed 96px per the specimen — not a responsive fraction of the column. A
// `grid-cols-4` on the 760px column produced 165px tiles, which is a different component.
//
// ⚑ ONE FILE PER SERVER-ACTION CALL, and that is not a style choice. Vercel caps a function's whole
// request payload at 4.5 MB; the gallery takes 8 images and two phone photos already exceed it. Each
// tile owns its own request, its own progress and its own error — which is also why one failure
// does not disturb the tiles that succeeded.
//
// Uploads happen BEFORE the product row exists (the uuid is generated server-side up front), so a
// failure here leaves orphaned objects and no product. See docs/design/g6-write-path.md §4b.

export type UploadedImage = { path: string; url: string }

// Shown in the dropzone hint as guidance, NOT enforced. `normalizeProductImage` caps the longest
// edge at PRODUCT_MAX_EDGE (1280) and never upscales, so a smaller source is accepted and simply
// stays small — telling the seller 1000px keeps their photos above the point where the marketplace
// card and D1's gallery start to look soft. Refusing them would be worse than a soft thumbnail.
const MIN_RECOMMENDED_EDGE = 1000

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
  const [dragging, setDragging] = useState(false)

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

  // 96px per specimen 532:32201, fixed rather than a column fraction.
  const tileBase =
    'relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-pill'

  const openPicker = () => inputRef.current?.click()

  return (
    <div>
      <p className="mb-3 text-sm text-text-muted">
        {t('product.form.images_hint', lang, { max: MAX_PRODUCT_IMAGES })}
      </p>

      {/* EMPTY STATE — full-width dashed dropzone. Drag-and-drop is wired here and not only on the
          tile grid, because "Glissez vos images ici" is a promise the surface has to keep. */}
      {tiles.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void handleFiles(e.dataTransfer.files)
          }}
        >
          <button
            type="button"
            onClick={openPicker}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${FOCUS_RING} ${
              dragging
                ? 'border-brand-blue-600 bg-brand-blue-50'
                : 'border-border-strong bg-surface-base hover:border-brand-blue-600'
            }`}
          >
            <UploadCloud className="h-7 w-7 text-text-muted" aria-hidden />
            <span className="text-sm font-medium text-text-primary">
              {t('product.form.dropzone_cta', lang)}
            </span>
            <span className="text-xs text-text-muted">
              {t('product.form.dropzone_hint', lang, {
                formats: t('product.form.dropzone_formats', lang),
                max: MAX_PRODUCT_IMAGES,
                minEdge: MIN_RECOMMENDED_EDGE,
              })}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
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

          {/* Dashed "+Ajouter" tile — the FILLED state's add affordance, per specimen 532:32201. */}
          {!atMax && (
            <button
              type="button"
              onClick={openPicker}
              className={`${tileBase} flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-border-strong text-text-muted transition-colors hover:border-brand-blue-600 hover:text-brand-blue-600 ${FOCUS_RING}`}
            >
              <ImagePlus className="h-5 w-5" aria-hidden />
              <span className="px-1 text-center text-[11px] font-medium leading-tight">
                {t('product.form.images_add', lang)}
              </span>
            </button>
          )}
        </div>
      )}

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
