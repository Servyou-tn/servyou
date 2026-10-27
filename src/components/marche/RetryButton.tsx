'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// The ErrorState action: re-runs the page's server loaders (router.refresh) — unlike an error
// boundary's reset(), which would only re-render what is already on screen.
export function RetryButton({ label }: { label: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <Button type="button" variant="secondary" size="md" loading={pending} onClick={() => startTransition(() => router.refresh())}>
      {label}
    </Button>
  )
}
