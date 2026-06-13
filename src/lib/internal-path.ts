// Open-redirect guard for a post-login ?redirect= target. A safe value is a
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
