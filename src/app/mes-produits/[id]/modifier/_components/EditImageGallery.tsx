'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Loader2, UploadCloud, ImageOff } from 'lucide-react'
import { toast } from 'sonner'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { uploadProductImageAction, addProductImageAction, deleteProductImageAction } from '@/app/actions/products'
import { MAX_PRODUCT_IMAGES } from '@/lib/products/constants'
import { MAX_INPUT_BYTES, MAX_INPUT_MB } from '@/lib/images/limits'

// G7's gallery — add and remove only, no reorder (§3 of the discovery: product_images has no
// UPDATE policy, and the storage policy mirrors it with a comment saying that's structural, not a
// convention — so the intended mechanism for any gallery change is delete + insert, never a
// row-level move).
//
// A SEPARATE component from ImageUploadGrid, not an extended one. That component owns a state
// machine built for "nothing is committed until final submit" — its own remove() only ever
// discards local, not-yet-uploaded state (ImageUploadGrid.tsx:184-188). Here every add and every
// remove is a real, immediately-committed write the moment it happens (there is no form submit to
// batch behind), so the two control flows genuinely differ at the two points that matter: what
// "done" means after an upload (one more network call here — the row insert — not just storage),
// and what "remove" does (a server delete + pending state, not a local discard). Threading a mode
// flag through ImageUploadGrid's functions to cover both would be the same mode-prop fork the form
// itself was ruled against.
//
// What's still reused, credited rather than re-derived: MAX_PRODUCT_IMAGES / MAX_INPUT_BYTES, the
// 96px fixed tile (a column fraction produced a different component per G6's own note), the cover
// badge sitting at the tile's BOTTOM (measured against the remove button's hit area, see
// ImageUploadGrid.tsx:268-277), and <bdi>-wrapped filenames in the failure list for RTL (see that
// file's note on why the wrapper — not the flex item — carries the isolation).

export type ExistingImage = { id: string; url: string }

type Tile =
  // A pre-existing row, or a freshly added one once its insert succeeds. `imageId` is what makes
  // it deletable — a tile without one (still uploading) has nothing on the server to delete yet.
  | { state: 'done'; key: string; imageId: string; url: string }
  | { state: 'uploading'; key: string; preview: string }
  | { state: 'removing'; key: string; imageId: string; url: string }
  // Not in the design (same honest gap ImageUploadGrid names for its own error tile) — the frame
  // has no failure state for either add or remove.
  | { state: 'error'; key: string; message: string; fileName: string }

let keySeq = 0
const nextKey = (name: string, size: number) => `${name}-${size}-${(keySeq += 1)}`

export function EditImageGallery({
  productId,
  initialImages,
}: {
  productId: string
  initialImages: ExistingImage[]
}) {
  const lang = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const [tiles, setTiles] = useState<Tile[]>(() =>
    initialImages.map((img) => ({ state: 'done' as const, key: img.id, imageId: img.id, url: img.url })),
  )
  const [dragging, setDragging] = useState(false)

  const previewsRef = useRef<Set<string>>(new Set())
  const tilesRef = useRef<Tile[]>(tiles)

  function mintPreview(file: File) {
    const url = URL.createObjectURL(file)
    previewsRef.current.add(url)
    return url
  }
  function revokePreview(url: string) {
    if (previewsRef.current.delete(url)) URL.revokeObjectURL(url)
  }

  useEffect(() => {
    const held = previewsRef.current
    return () => {
      for (const url of held) URL.revokeObjectURL(url)
      held.clear()
    }
  }, [])

  const failed = tiles.flatMap((x) => (x.state === 'error' ? [x] : []))
  const committedCount = tiles.filter((x) => x.state === 'done' || x.state === 'removing').length
  const atMax = committedCount + tiles.filter((x) => x.state === 'uploading').length >= MAX_PRODUCT_IMAGES

  function commit(next: Tile[]) {
    tilesRef.current = next
    setTiles(next)
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const current = tilesRef.current
    const room =
      MAX_PRODUCT_IMAGES -
      (current.filter((x) => x.state === 'done' || x.state === 'removing').length +
        current.filter((x) => x.state === 'uploading').length)
    const accepted = Array.from(files).slice(0, Math.max(0, room))

    for (const file of accepted) {
      const key = nextKey(file.name, file.size)

      if (file.size > MAX_INPUT_BYTES) {
        commit([
          ...tilesRef.current,
          { state: 'error', key, message: t('product.image.error.tooLarge', lang, { max: MAX_INPUT_MB }), fileName: file.name },
        ])
        continue
      }

      const preview = mintPreview(file)
      commit([...tilesRef.current, { state: 'uploading', key, preview }])

      const fd = new FormData()
      fd.append('productId', productId)
      fd.append('image', file)
      const uploadRes = await uploadProductImageAction(fd)

      if (!uploadRes.ok) {
        revokePreview(preview)
        commit(
          tilesRef.current.map((x): Tile =>
            x.key === key ? { state: 'error', key, message: uploadRes.error, fileName: file.name } : x,
          ),
        )
        continue
      }

      // Second half of the add: the upload put bytes in storage, this makes them a real gallery
      // row. A failure here leaves an orphaned object (same residue class uploadProductImageAction
      // already documents) — the tile reports it as a normal upload failure, not a special case.
      const insertRes = await addProductImageAction({ productId, path: uploadRes.path })
      revokePreview(preview)
      commit(
        tilesRef.current.map((x): Tile =>
          x.key === key
            ? insertRes.ok
              ? { state: 'done', key, imageId: insertRes.imageId, url: insertRes.url }
              : { state: 'error', key, message: insertRes.error, fileName: file.name }
            : x,
        ),
      )
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  function removeError(key: string) {
    commit(tilesRef.current.filter((x) => x.key !== key))
  }

  // Real, committed rows only — no optimistic removal. The tile stays put and shows a pending
  // state until the server confirms; on failure it reverts rather than disappearing, because
  // unlike a not-yet-uploaded local pick, there is a real row that may or may not still exist.
  async function removeExisting(tile: Extract<Tile, { state: 'done' }>) {
    commit(
      tilesRef.current.map((x): Tile =>
        x.key === tile.key ? { state: 'removing', key: tile.key, imageId: tile.imageId, url: tile.url } : x,
      ),
    )
    const res = await deleteProductImageAction({ productId, imageId: tile.imageId })
    if (!res.ok) {
      toast.error(res.error)
      commit(
        tilesRef.current.map((x): Tile =>
          x.key === tile.key ? { state: 'done', key: tile.key, imageId: tile.imageId, url: tile.url } : x,
        ),
      )
      return
    }
    commit(tilesRef.current.filter((x) => x.key !== tile.key))
  }

  const tileBase =
    'relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border-subtle bg-surface-pill'

  const openPicker = () => inputRef.current?.click()

  return (
    <div>
      <p className="mb-3 text-sm text-text-muted">
        {t('product.form.images_hint', lang, { max: MAX_PRODUCT_IMAGES })}
      </p>

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
            <span className="text-sm font-medium text-text-primary">{t('product.form.dropzone_cta', lang)}</span>
            <span className="text-xs text-text-muted">
              {t('product.form.dropzone_hint', lang, {
                formats: t('product.form.dropzone_formats', lang),
                max: MAX_PRODUCT_IMAGES,
                minEdge: 1000,
              })}
            </span>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {tiles.map((tile, i) => {
            const isFirstDone = i === tiles.findIndex((x) => x.state === 'done' || x.state === 'removing')
            return (
              <div key={tile.key} className={tileBase}>
                {tile.state === 'uploading' && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview, discarded once committed or failed */}
                    <img src={tile.preview} alt="" className="h-full w-full object-cover opacity-40" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-blue-600" aria-hidden />
                      <span className="text-xs text-text-muted">{t('product.form.images_uploading', lang)}</span>
                    </div>
                  </>
                )}

                {(tile.state === 'done' || tile.state === 'removing') && (
                  <>
                    {/* A real, stored URL — next/image, not the blob: shortcut ImageUploadGrid
                        takes for its own uploading/done tiles (those hold bytes the browser
                        already has in memory; these are existing rows with nothing local to
                        show). */}
                    <Image src={tile.url} alt="" fill sizes="96px" className="object-cover" />
                    {isFirstDone && (
                      <span className="absolute inset-x-0 bottom-0 truncate bg-brand-blue-600 px-1.5 py-1 text-center text-[10px] font-medium leading-tight text-white">
                        {t('product.form.images_cover', lang)}
                      </span>
                    )}
                    {tile.state === 'removing' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeExisting(tile)}
                        aria-label={t('product.form.images_remove', lang)}
                        className={`absolute end-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 ${FOCUS_RING}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </>
                )}

                {tile.state === 'error' && (
                  <>
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                      <ImageOff className="h-6 w-6 text-danger-500" aria-hidden />
                      <span className="text-xs font-medium text-danger-700">{t('product.form.images_failed', lang)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeError(tile.key)}
                      aria-label={t('product.form.images_remove', lang)}
                      className={`absolute end-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 ${FOCUS_RING}`}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </>
                )}
              </div>
            )
          })}

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

      {failed.length > 0 && (
        <ul role="alert" className="mt-3 space-y-2">
          {failed.map((f) => (
            <li key={f.key} className="flex flex-col gap-0.5 text-start">
              <span className="text-sm font-medium text-text-primary">
                <bdi>{f.fileName}</bdi>
              </span>
              <span className="text-sm text-danger-700">{f.message}</span>
            </li>
          ))}
        </ul>
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
