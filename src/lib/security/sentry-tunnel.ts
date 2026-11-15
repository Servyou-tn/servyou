// The Sentry tunnel at /monitoring is pinned to OUR Sentry project (audit M7, PR 16).
//
// withSentryConfig's `tunnelRoute` adds a Next.js rewrite that forwards `POST /monitoring?o=<org>&p=<project>[&r=<region>]`
// to `https://o<org>.ingest[.<region>].sentry.io/api/<project>/envelope/`, taking the org and project from the query with
// a `\d*` pattern: anyone could relay events through servyou to ANY Sentry project. Its options cannot restrict them.
//
// Next.js checks redirects before rewrites (headers -> redirects -> rewrites), so these redirects turn away every /monitoring
// request whose `o` or `p` is not our DSN's before Sentry's rewrite can forward it. Our own browser events pass untouched:
// the SDK builds the same query from the same DSN (@sentry/nextjs client/tunnelRoute: `?o=<org>&p=<project>&r=<region>`),
// and the parsing below mirrors its pattern. Next anchors these values (`^…$`) and, like Sentry's rewrite, reads the LAST
// value of a repeated parameter, so the guard and the rewrite always look at the same `o` and `p`.
//
// A refused request is sent (307, method kept) to a path that does not exist, so it ends in a 404 and nothing is forwarded.
// No DSN, or one that is not a Sentry SaaS DSN: the browser never tunnels (the SDK skips it), so every /monitoring request
// is refused.

/** The tunnel path, shared by next.config.ts `tunnelRoute` and the guard. */
export const SENTRY_TUNNEL_ROUTE = '/monitoring'

/** Where a refused tunnel request is sent: no page lives here, so it is a 404. */
export const SENTRY_TUNNEL_REFUSED = '/monitoring-refused'

/** The org and project id of a Sentry SaaS DSN, parsed exactly like @sentry/nextjs does; null for anything else. */
export function sentryDsnIds(dsn: string | null | undefined): { orgId: string; projectId: string } | null {
  if (!dsn) return null
  let url: URL
  try {
    url = new URL(dsn)
  } catch {
    return null
  }
  const org = /^o(\d+)\.ingest(?:\.([a-z]{2}))?\.sentry\.io$/.exec(url.hostname)
  const projectId = url.pathname.split('/').filter(Boolean).pop()
  if (url.protocol !== 'https:' || !org || !projectId || !/^\d+$/.test(projectId)) return null
  return { orgId: org[1], projectId }
}

type QueryCondition = { type: 'query'; key: string; value: string }
export type TunnelGuardRedirect = {
  source: string
  destination: string
  permanent: false
  missing?: QueryCondition[]
}

/**
 * The redirects that pin the tunnel. One rule per parameter: a rule applies when its `missing` condition does NOT match,
 * i.e. when that parameter is absent or is not ours, so either a foreign org or a foreign project is enough to refuse.
 */
export function sentryTunnelRedirects(dsn: string | null | undefined): TunnelGuardRedirect[] {
  const refuse = (missing?: QueryCondition): TunnelGuardRedirect => ({
    // `{/}?`: the same optional trailing slash as Sentry's own rewrite source (`/monitoring(/?)`).
    source: `${SENTRY_TUNNEL_ROUTE}{/}?`,
    destination: SENTRY_TUNNEL_REFUSED,
    permanent: false,
    ...(missing ? { missing: [missing] } : {}),
  })
  const ids = sentryDsnIds(dsn)
  if (!ids) return [refuse()]
  return [
    refuse({ type: 'query', key: 'o', value: ids.orgId }),
    refuse({ type: 'query', key: 'p', value: ids.projectId }),
  ]
}
