'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { advanceOrderAction } from '@/app/actions/orders'
import { cn } from '@/lib/utils'

// One button = one hop along the seller-owned chain. The TARGET is derived server-side from the
// order's current state, so this sends only an id and the path to revalidate.
//
// `whatsappStyle` renders the measured wa/brand treatment the `pending` variant uses
// (Figma 490:25700: #25d366 fill, dark label, h-36, px-16, radius 10). It is a SKIN, not a
// different behaviour — the click performs the same transition. See OrderActionRow's header for
// why confirming a COD order wears WhatsApp's colours here.
export function AdvanceOrderButton({
  orderId,
  label,
  whatsappStyle,
}: {
  orderId: string
  label: string
  whatsappStyle?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const run = () => {
    setError(null)
    startTransition(async () => {
      const result = await advanceOrderAction({ orderId, revalidate: '/commandes-recues' })
      if (result.ok) router.refresh()
      else setError(result.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {whatsappStyle ? (
        <button
          type="button"
          onClick={run}
          disabled={pending}
          aria-busy={pending || undefined}
          className={cn(
            'inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-wa-brand px-4',
            'text-body-sm font-semibold text-text-primary whitespace-nowrap',
            'transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60',
            'motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2',
          )}
        >
          {label}
        </button>
      ) : (
        <Button variant="secondary" size="sm" loading={pending} onClick={run}>
          {label}
        </Button>
      )}
      {error ? (
        <p role="alert" className="text-caption text-danger-500">
          {error}
        </p>
      ) : null}
    </div>
  )
}
