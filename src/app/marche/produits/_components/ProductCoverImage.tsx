'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'

// The product cover, and the ONLY place the cover placeholder exists.
//
// ⚑ TWO WAYS TO HAVE NO PICTURE, ONE PLACEHOLDER. A product can have no photo row at all
// (`image_url === null`, answered on the server at render time) or have one that fails to load
// (answered in the browser, after render). Those used to be different things: the card branched on
// the DATA only, so a product WITH a url always took the <Image> path and a failed fetch left the
// browser's native broken-image glyph — a torn sliver in a 276px box — sitting beside neighbours
// showing a clean grey placeholder. Both paths now resolve to the same `<Placeholder />` below.
// Do not re-inline the glyph at a call site; that is how the two drift apart again.
//
// This component is the reason the error handling does not push its parent into the client bundle
// any further than it already is: `onError` is an event handler, so it needs a client component,
// and this is the smallest one that can hold it.

function Placeholder() {
  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
      <ImageIcon className="h-12 w-12 text-icon-muted" />
    </div>
  )
}

export function ProductCoverImage({
  src,
  alt,
  sizes,
}: {
  src: string | null
  alt: string
  sizes: string
}) {
  // ⚑ WHICH src failed, not merely THAT one did. A boolean would be sticky: this component is
  // rendered from a mapped list, so React reuses the same instance for a different product when
  // the list reorders (a filter, a sort, page 2). A stuck `true` would then blank a perfectly good
  // photo. Recording the failing url and comparing it to the current one self-heals on any change
  // of src, with no effect and no key prop for the caller to remember.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) return <Placeholder />

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
      // Fires for a 404, a 400 from the optimizer, a DNS failure, or a decode error — every way the
      // browser can end up with no pixels. The state write is idempotent per src.
      onError={() => setFailedSrc(src)}
    />
  )
}
