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
export function AdvanceOrderButton({ orderId, label }: { orderId: string; label: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="secondary"
        size="sm"
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
