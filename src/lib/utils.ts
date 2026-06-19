import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Standard shadcn/Magic-UI class merge helper: clsx resolves conditionals, then
// tailwind-merge dedupes conflicting Tailwind utilities (last one wins).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** The display first name: first whitespace-separated word of full_name ('' when absent). */
export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/).filter(Boolean)[0] ?? ''
}
