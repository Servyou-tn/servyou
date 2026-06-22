'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'
import { ImageIcon } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// Generic image gallery (product photos / service work samples). Primary image +
// thumbnail row; clicking a thumbnail swaps the primary with a short crossfade. A counter
// pill (n/total) sits over the primary when there are multiple images. Thumbnails scroll
// horizontally on narrow screens (tap to switch — the touch equivalent of swiping). The
// empty state is overridable (emptyIcon/emptyLabel) so callers can phrase it per domain
// ("Aucune image" for products, "Aucun aperçu disponible" for services).
export function ProductGallery({
  images,
  title,
  emptyIcon,
  emptyLabel,
}: {
  images: { url: string }[]
  title: string
  emptyIcon?: ReactNode
  emptyLabel?: string
}) {
  const lang = useLang()
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)

  if (images.length === 0) {
    return (
      <div className="outline-brand rounded-2xl bg-white p-4">
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 text-text-muted">
          {emptyIcon ?? <ImageIcon className="h-12 w-12" aria-hidden="true" />}
          <p className="text-sm">{emptyLabel ?? t('product.detail.no_images', lang)}</p>
        </div>
      </div>
    )
  }

  const index = Math.min(active, images.length - 1)
  const current = images[index]

  return (
    <div className="outline-brand rounded-2xl bg-white p-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50">
        <motion.div
          key={current.url}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <Image
            src={current.url}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover"
            priority
          />
        </motion.div>
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            {index + 1}/{images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${title} — image ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg ring-2 transition-all duration-200 ease-out ${FOCUS_RING} ${
                i === index ? 'ring-brand-accent' : 'ring-transparent hover:ring-border-subtle'
              }`}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
