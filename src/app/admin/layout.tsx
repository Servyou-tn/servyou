import { requireAdmin } from '@/lib/auth/require-admin'
import { AdminShell } from './AdminShell'

// Server-side admin gate for the whole /admin tree. Replaces the old client-side useEffect check,
// which rendered a loading state and then redirected from the browser — the server now redirects
// before any admin markup is sent. Every admin page also calls requireAdmin itself (a layout does
// not re-render on client-side navigation), and every admin server action calls checkAdmin; the
// RLS / is_admin()-gated RPCs remain the real boundary underneath all three.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin('/admin')
  return <AdminShell>{children}</AdminShell>
}
