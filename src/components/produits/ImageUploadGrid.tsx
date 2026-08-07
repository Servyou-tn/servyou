'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X, Loader2, UploadCloud, ImageOff } from 'lucide-react'
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

// ⚑ A DONE TILE KEEPS ITS `preview` — the local blob: URL — and goes on rendering it for the rest
// of the session. It does NOT swap to `image.url`. See the note on the done tile's <img>.
type Tile =
  | { state: 'uploading'; key: string; preview: string }
  | { state: 'done'; key: string; image: UploadedImage; preview: string }
  // `fileName` is carried so the failure list below the grid can say WHICH file failed. With up to
  // MAX_PRODUCT_IMAGES tiles, "3 of these 8 failed" is unusable without the name.
  | { state: 'error'; key: string; message: string; fileName: string }

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

  // Every blob: URL this component has minted and not yet released. A ref, not state, because the
  // unmount cleanup below must see the CURRENT set — a [] effect closes over the first render's
  // state and would release nothing.
  const previewsRef = useRef<Set<string>>(new Set())

  // Monotonic counter for React keys. Deliberately NOT Math.random(): the same file can legitimately
  // be picked twice (name + size collide), so the key needs a tiebreaker, and an impure call in the
  // component body trips react-hooks/purity under the React Compiler lint.
  const keySeqRef = useRef(0)

  // ⚑ THE REF IS THE SOURCE OF TRUTH FOR TILE MUTATIONS; `tiles` state exists to drive the render.
  //
  // `handleFiles` awaits one upload per file in a loop, so the `tiles` captured in its closure is
  // stale from the second iteration onward. The functional updater form fixed that staleness, but
  // it also invited the PARENT NOTIFICATION into the updater — and an updater body runs during
  // React's render phase, where calling a parent's setState is illegal. React said so out loud:
  //   "Cannot update a component (`ProductForm`) while rendering a different component
  //    (`ImageUploadGrid`)"
  // An impure updater is not a style problem: updaters may be invoked more than once, and are under
  // StrictMode and concurrent rendering, which would fire `onChange` a second time with the parent
  // mid-render. Holding the list in a ref lets every mutation compute the next array OUTSIDE the
  // render phase, so `commit` can set state and notify the parent from the event handler, where
  // both belong.
  const tilesRef = useRef<Tile[]>([])

  function mintPreview(file: File) {
    const url = URL.createObjectURL(file)
    previewsRef.current.add(url)
    return url
  }
  function revokePreview(url: string) {
    if (previewsRef.current.delete(url)) URL.revokeObjectURL(url)
  }

  // Blob URLs are held for the life of the page, so they must be released when the form goes away
  // (navigating off after a successful create, most often). Without this the bytes stay pinned in
  // memory until a full reload.
  useEffect(() => {
    const held = previewsRef.current
    return () => {
      for (const url of held) URL.revokeObjectURL(url)
      held.clear()
    }
  }, [])

  // Narrowed to the error variant so the list below can read `fileName` without a second guard.
  const failed = tiles.flatMap((x) => (x.state === 'error' ? [x] : []))
  const doneCount = tiles.filter((x) => x.state === 'done').length
  const atMax = doneCount + tiles.filter((x) => x.state === 'uploading').length >= MAX_PRODUCT_IMAGES

  // THE ONLY WAY TILES CHANGE. Ref first so the next iteration of an upload loop reads the current
  // list, then state for the render, then the parent — which is recomputed from the tile list on
  // every mutation so the parent's ordering always matches what the seller sees. Derived, never a
  // second source of truth.
  function commit(next: Tile[]) {
    tilesRef.current = next
    setTiles(next)
    onChange(next.flatMap((x) => (x.state === 'done' ? [x.image] : [])))
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    // From the REF, not from `tiles`: two picks in quick succession would otherwise both measure
    // against the same pre-upload list and together exceed MAX_PRODUCT_IMAGES.
    const current = tilesRef.current
    const room =
      MAX_PRODUCT_IMAGES -
      (current.filter((x) => x.state === 'done').length +
        current.filter((x) => x.state === 'uploading').length)
    const accepted = Array.from(files).slice(0, Math.max(0, room))

    for (const file of accepted) {
      const key = `${file.name}-${file.size}-${(keySeqRef.current += 1)}`

      // Rejected before the request is even sent — MAX_INPUT_BYTES lives in limits.ts precisely so
      // the client can do this without importing sharp.
      if (file.size > MAX_INPUT_BYTES) {
        commit([
          ...tilesRef.current,
          {
            state: 'error',
            key,
            message: t('product.image.error.tooLarge', lang, { max: MAX_INPUT_MB }),
            fileName: file.name,
          },
        ])
        continue
      }

      const preview = mintPreview(file)
      commit([...tilesRef.current, { state: 'uploading', key, preview }])

      const fd = new FormData()
      fd.append('productId', productId)
      fd.append('image', file)

      const res = await uploadProductImageAction(fd)

      // ⚑ DO NOT REVOKE ON SUCCESS. The done tile keeps rendering this exact blob: URL, so
      // revoking here is what would blank it. Only a discarded preview is revoked — a failed
      // upload below, an explicit remove(), or unmount.
      if (!res.ok) revokePreview(preview)

      // Computed OUTSIDE any updater — see the note on `tilesRef`. `commit` then does the state set
      // and the parent notification together, from the event handler rather than from a render.
      commit(
        tilesRef.current.map((x): Tile =>
          x.key === key
            ? res.ok
              ? { state: 'done', key, image: { path: res.path, url: res.url }, preview }
              : { state: 'error', key, message: res.error, fileName: file.name }
            : x,
        ),
      )
    }

    // Let the same file be picked again after a removal.
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(key: string) {
    const gone = tilesRef.current.find((x) => x.key === key)
    if (gone && gone.state !== 'error') revokePreview(gone.preview)
    commit(tilesRef.current.filter((x) => x.key !== key))
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
                {/* ⚑ THE LOCAL blob:, NOT `tile.image.url`, AND NOT next/image. DELIBERATE.
                    This is a 96px thumbnail of a file the browser is already holding, so a network
                    round trip to render it was always the wrong shape — the bytes are in memory and
                    the preview is already on screen from the uploading state. Keeping it is zero
                    network, instant, and independent of the image optimizer entirely.
                    It also sidesteps a real failure: /_next/image 400s on these objects because
                    Next 16's SSRF guard sees the Supabase host resolve to NAT64 addresses
                    (64:ff9b::/96) alongside its public ones and refuses the fetch. That is logged
                    separately — this tile no longer depends on the answer either way.
                    ⚑ `tile.image.path` is still what gets SUBMITTED. Only the pixels are local. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL; next/image cannot optimize one, and this needs no optimizing */}
                <img src={tile.preview} alt="" className="h-full w-full object-cover" />
                {/* Cover badge: insert order IS gallery order, so the first done tile is the cover.
                    ⚑ BOTTOM, NOT TOP — and that is the specimen (532:32201), not a workaround.
                    At the top it collided with the remove button: measured, the button occupies
                    x 59→87 of the 96px tile (`end-2` + 28px wide) and painted OVER the ribbon's
                    tail, hiding 15.91px of glyphs — "Couverture" read as "Couvertu". It was never
                    CSS clipping; scrollWidth == clientWidth throughout, so `truncate` never fired
                    and no ellipsis ever appeared. Two fixes were ruled out by measurement: insetting
                    the ribbon to clear the button leaves ~38px of content box for a 53.83px string,
                    which trades occlusion for REAL clipping; and painting the ribbon above the
                    button eats its hit area. At the bottom the two do not overlap at all. */}
                {i === tiles.findIndex((x) => x.state === 'done') && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-brand-blue-600 px-1.5 py-1 text-center text-[10px] font-medium leading-tight text-white">
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

            {/* ⚑ INVENTED STATE — NOT IN THE DESIGN. Specimen 532:32201 specifies exactly THREE
                tile states: done (grip + X + cover ribbon), uploading (dimmed + percentage +
                progress bar), and the dashed "+ Ajouter" tile. It has NO failure state, so this
                one was designed here, deliberately, and a later fidelity pass should read it as an
                invention rather than as drift from a spec that never covered it.

                WHY THE MESSAGE IS NOT IN THE TILE. The tile's content box is 72×72 after padding —
                about two lines at 12px. The messages are full sentences, and the longest is
                instructional:
                  "Les photos HEIC ne sont pas prises en charge. Sur iPhone : Réglages > Appareil
                   photo > Formats > « Plus compatible »."
                That is 117 characters, and it is the one message a seller MUST be able to read —
                it tells them how to fix their phone. Measured in the tile it ran to 5 lines and
                111–119px against 94px of box, spilling 16px past both edges under
                `overflow-hidden`. line-clamp would "fix" the overflow by truncating hardest
                exactly the message that most needs reading. So the tile carries an icon and a
                one-word label, and the sentence goes to the full-width list below the grid.

                The remove control is now the SAME top-end icon button as every other tile. The old
                text button wrapped "Retirer cette photo" onto three lines inside a 56px box and
                lost the third to the clip — it rendered as "Retirer cette". */}
            {tile.state === 'error' && (
              <>
                <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                  <ImageOff className="h-6 w-6 text-danger-500" aria-hidden />
                  <span className="text-xs font-medium text-danger-600">
                    {t('product.form.images_failed', lang)}
                  </span>
                </div>
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

      {/* THE FAILURE LIST — the other half of the invented error state above.
          Full width, so the 117-character HEIC instruction is actually readable, which is the whole
          reason the message left the 96px tile.
          ⚑ THE FILENAME IS THE POINT. Up to MAX_PRODUCT_IMAGES upload at once, so when three of
          eight fail the seller's real question is "which three?" — a message with no name cannot
          answer it, and the tile it belongs to shows only an icon.
          ⚑ THE `<bdi>` IS WRAPPED, NOT THE FLEX ITEM ITSELF — measured, not styled by eye.
          `<bdi>` defaults to `dir="auto"`, which resolves the ELEMENT's direction from its first
          strong character. A latin filename therefore makes the element LTR, and as a direct child
          of this flex column it stretches to the full row, so its `text-align: start` resolved to
          the LEFT — in Arabic the name sat at the far left of a right-aligned list, 582px away
          from the message describing it. Isolation was right; letting `<bdi>` own the ALIGNMENT
          was not. The outer `<span>` inherits the page direction (so start = right in AR) and the
          `<bdi>` isolates only the run, which is the job it is actually for: a latin filename next
          to Arabic text would otherwise reorder visibly.
          role="alert" because the previous version announced nothing: the message was clipped text
          inside overflow-hidden, which is invisible to a screen reader in practice. */}
      {failed.length > 0 && (
        <ul role="alert" className="mt-3 space-y-2">
          {failed.map((f) => (
            <li key={f.key} className="flex flex-col gap-0.5 text-start">
              <span className="text-sm font-medium text-text-primary">
                <bdi>{f.fileName}</bdi>
              </span>
              <span className="text-sm text-danger-600">{f.message}</span>
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
