'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

// J1 « Actualiser » (Button / secondary / md): re-renders the server page, so every figure is read again.
export function RefreshButton({ label }: { label: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <Button variant="secondary" size="md" loading={pending} onClick={() => startTransition(() => router.refresh())}>
      {label}
    </Button>
  )
}
