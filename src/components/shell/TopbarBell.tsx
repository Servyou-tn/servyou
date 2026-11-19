import { loadBellFeed } from '@/lib/notifications/bell-feed'
import { TopbarNotifications } from './TopbarNotifications'

// The bell's server half (plan §3 decision 3: no Realtime — the unread count and the 20 newest items are read on every
// page load, so the badge is right before any JavaScript runs). AppShell streams it in its own Suspense slot, for a
// signed-in reader only: anon has no SELECT grant on notifications. A failed read comes back as `{ ok: false }` (already
// reported by the loader) and the panel says so.
export async function TopbarBell({ readerId }: { readerId: string }) {
  const feed = await loadBellFeed(readerId)
  return <TopbarNotifications feed={feed} />
}
