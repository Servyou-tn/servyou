'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { advanceOrderAction } from '../actions'

// The smallest interactive leaf on G4 — everything else on this page is a server component.
// One button = one hop along the seller-owned chain; the TARGET status is derived server-side
// from the order's current state, so this sends only an id.
export function AdvanceOrderButton({
  orderId,
  label,
  variant = 'primary',
}: {
  orderId: string
  label: string
  variant?: 'primary' | 'secondary'
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={variant}
        size="sm"
        loading={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await advanceOrderAction({ orderId })
            if (result.ok) {
              // The action revalidates the path; refresh pulls the new server render so the row
              // moves out of the action queue without a full navigation.
              router.refresh()
            } else {
              setError(result.error)
            }
          })
        }}
      >
        {label}
      </Button>
      {/* The trigger's own French message when a transition is genuinely invalid — e.g. the same
          order was advanced in another tab. role=alert so it is announced, not just painted. */}
      {error ? (
        <p role="alert" className="text-caption text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  )
}
