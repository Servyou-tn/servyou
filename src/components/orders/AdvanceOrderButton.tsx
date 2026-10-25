'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { advanceOrderAction } from '@/app/actions/orders'
import type { SellerOrderPath } from '@/lib/orders/seller-paths'

// One button = one hop along the seller-owned chain. The TARGET is derived server-side from the
// order's current state, so this sends only an id and the path to revalidate.
//
// Shared by G8/G9 (shop owner) and H8 (freelancer) — promoted from commandes-recues/_components when H8
// became the second consumer; the caller names the route whose data this transition changes.
//
// The wa/brand SKIN this used to carry is gone (G9 pass): WhatsApp contacts the buyer, it does
// not advance the order, so contact is its own control now. See OrderActionRow's header.
export function AdvanceOrderButton({
  orderId,
  label,
  revalidate = '/commandes-recues',
  variant = 'secondary',
  size = 'sm',
  fullWidth,
  className,
}: {
  orderId: string
  label: string
  /** The page that shows this order's status — refreshed server-side after the hop. */
  revalidate?: SellerOrderPath
  /** G8's row uses the compact secondary; G9's rail uses Figma's full-width filled primary. */
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'lg'
  fullWidth?: boolean
  /** Extra classes on the button itself (H8's row pins it to the frame's 120 px). */
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  return (
    <div className={fullWidth ? 'flex w-full flex-col gap-1' : 'flex flex-col items-end gap-1'}>
      <Button
        variant={variant}
        size={size}
        className={cn(fullWidth && 'w-full', className)}
        loading={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await advanceOrderAction({ orderId, revalidate })
            if (result.ok) router.refresh()
            else setError(result.error)
          })
        }}
      >
        {label}
      </Button>
      {error ? (
        <p role="alert" className="text-caption text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  )
}
