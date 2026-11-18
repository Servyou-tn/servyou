import { loadBellFeed } from '@/lib/notifications/bell-feed'
import { TopbarNotifications } from './TopbarNotifications'

// The server half of the topbar bell (plan §3 decision 3): the unread count and the list are read on the server for
// every page load, then handed to the client dropdown. AppShell streams it in a Suspense slot, so a slow read never
// holds the page. Rendered for a signed-in user only — anon has no SELECT grant on notifications.
export async function TopbarBell({ readerId }: { readerId: string }) {
  const feed = await loadBellFeed(readerId)
  return <TopbarNotifications feed={feed} />
}
