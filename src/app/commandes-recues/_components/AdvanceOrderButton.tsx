'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { advanceOrderAction } from '@/app/actions/orders'

// One button = one hop along the seller-owned chain. The TARGET is derived server-side from the
// order's current state, so this sends only an id and the path to revalidate.
//
// The wa/brand SKIN this used to carry is gone (G9 pass): WhatsApp contacts the buyer, it does
// not advance the order, so contact is its own control now. See OrderActionRow's header.
export function AdvanceOrderButton({
  orderId,
  label,
  variant = 'secondary',
  size = 'sm',
  fullWidth,
}: {
  orderId: string
  label: string
  /** G8's row uses the compact secondary; G9's rail uses Figma's full-width filled primary. */
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'lg'
  fullWidth?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  return (
    <div className={fullWidth ? 'flex w-full flex-col gap-1' : 'flex flex-col items-end gap-1'}>
      <Button
        variant={variant}
        size={size}
        className={fullWidth ? 'w-full' : undefined}
        loading={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await advanceOrderAction({ orderId, revalidate: '/commandes-recues' })
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
