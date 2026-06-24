'use client'

import { useReducedMotion } from 'motion/react'
import { BlurFade } from '@/components/magicui/blur-fade'
import { JobPostCard } from './JobPostCard'
import type { JobPostRow } from '@/lib/freelance/job-board-data'

// The open-posts list — full-width horizontal rows, one per line (the same hire-rhythm as the
// services list), with a staggered, reduced-motion-aware BlurFade entrance. The entrance lives
// here so JobPostCard stays a pure presenter (mirrors ListingResults).
export function JobPostsList({ items }: { items: JobPostRow[] }) {
  const reduce = useReducedMotion()
  const fade = { offset: reduce ? 0 : 6, blur: reduce ? '0px' : '6px' }

  return (
    <div className="flex flex-col gap-4">
      {items.map((job, i) => (
        <BlurFade key={job.id} delay={i * 0.05} duration={0.2} {...fade} inView>
          <JobPostCard job={job} />
        </BlurFade>
      ))}
    </div>
  )
}
