import { resolveRole, roleDashboardPath } from '@/lib/roles'

// Open-redirect guard for a post-login ?next= target. A safe value is a
// same-origin ABSOLUTE path: it starts with a single "/", is not protocol-relative
// ("//host" → external), has no backslash tricks ("/\evil.com", which some browsers
// normalise to "//"), and carries no control characters that could smuggle a scheme
// or host. Anything failing these is ignored and the caller falls back to a known
// internal route. Keep this the single source of truth for the check.
export function isValidInternalPath(path: string | null | undefined): boolean {
  if (typeof path !== 'string' || path.length === 0) return false
  if (!path.startsWith('/')) return false // must be an absolute, same-origin path
  if (path.startsWith('//')) return false // protocol-relative → external host
  if (path.includes('\\')) return false // backslash bypass (e.g. "/\evil.com")
  // Reject ASCII control characters (could smuggle a scheme/host). Done with a
  // charCode scan rather than a control-char regex literal (keeps eslint's
  // no-control-regex happy and avoids fragile non-printable bytes in source).
  for (let i = 0; i < path.length; i++) {
    if (path.charCodeAt(i) <= 0x1f) return false
  }
  return true
}

// Pulls the post-login destination out of a query string, validated against the same guard.
// Extracted as its own pure function (rather than inlined in SigninForm) so the exact
// param-name-in / destination-out contract is unit-testable without mocking Supabase or
// next/navigation — this is the line that regressed once already (every guard in the app emits
// `?next=`, the reader had drifted to `?redirect=`), so it needs a test that would catch a repeat.
export function resolvePostLoginDestination(search: string, fallback = '/'): string {
  const next = new URLSearchParams(search).get('next')
  return next && isValidInternalPath(next) ? next : fallback
}

// Post-login destination once the viewer's profile is known. A safe ?next= always wins — a guard
// bounced them from a specific page, and they should land back on it whatever their role. Without
// one, freelancers and shop owners go to their own dashboard; consumers, admins and anyone whose
// profile could not be read keep the historical `/` (an admin who is also a seller stays on `/`
// too: the admin area is not a role dashboard). Pure, so the whole matrix is unit-testable.
export function resolveSignInDestination(
  search: string,
  profile: { seller_type?: string | null; is_admin?: boolean | null } | null | undefined,
): string {
  const roleHome = profile && !profile.is_admin ? roleDashboardPath(resolveRole(profile)) : '/'
  return resolvePostLoginDestination(search, roleHome)
}
