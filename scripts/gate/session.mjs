// Gate session minting — a real Supabase session for a real account, held in memory only.
//
// WHY THIS EXISTS: 12 of the 20 v2-shell routes sit behind `requireShopOwner` /
// `requireFreelancer` and 307 to /connexion for an anonymous client, so the visual gate and every
// CDP measurement pass could only ever reach the 3 anonymous routes. That is the single largest
// gate-coverage hole in the app (docs/follow-ups.md — "12 of the 20 v2-shell routes cannot be
// gated without an authenticated session"), and it is why the shell's freelancer and shop_owner
// sidebar variants have never been gated. This is the "seeded gate account + scripted login" half
// of that item's proposed fix.
//
// ⚑ NOTHING HERE TOUCHES DISK. The access token, the refresh token and the encoded cookies are
// returned to the caller and live only in the calling process's memory. Do not add a cache file,
// a --out flag, or a debug dump: a committed session is a committed credential.
//
// ⚑ LOCALHOST ONLY. The cookies are minted to be injected into a throwaway local Chrome profile
// against http://localhost. Nothing here should ever run in CI against a deployed origin.
//
// HOW IT GETS A SESSION WITHOUT A PASSWORD:
//   1. service_role `admin.generateLink({ type: 'magiclink' })` returns a `hashed_token`. It does
//      NOT send mail (that is `inviteUserByEmail`) — so this has no side effect on the account's
//      inbox.
//   2. The ANON client exchanges that hash via `verifyOtp` for a genuine access/refresh pair.
//      Single-use: the hash is consumed here.
//   3. The pair is re-encoded into cookies BY @supabase/ssr ITSELF (see below).
//
// WHY STEP 3 GOES THROUGH THE LIBRARY. @supabase/ssr's cookie format is an implementation detail:
// it is currently `base64-` + base64url(JSON), chunked across `<name>.0` / `.1` past ~3180 bytes,
// and it has changed across minor versions. Hand-encoding it would silently break on the next
// `npm update` — the cookie would be set, the app would fail to parse it, and the symptom would be
// an anonymous 307 that looks exactly like a mint failure. Driving a real `createServerClient`
// through a fake cookie jar means the format is BY CONSTRUCTION whatever src/lib/supabase/server.ts
// reads back.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

/**
 * Minimal .env parser — a standalone node script gets no Next.js env loading, and adding dotenv
 * for three variables is not worth a dependency. Handles `KEY=value`, quotes, `export ` and #
 * comments; ignores everything else.
 */
export function loadEnv(file = '.env.local') {
  const p = path.resolve(process.cwd(), file)
  if (!fs.existsSync(p)) throw new Error(`missing ${file} — cannot mint a gate session without it`)
  const out = {}
  for (const raw of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

/**
 * Mint auth cookies for `email`.
 *
 * @returns {Promise<{cookies: {name: string, value: string}[], userId: string, host: string}>}
 *   `cookies` is ready for CDP `Network.setCookie`. No token is returned in the clear beyond what
 *   is inside the cookie value itself, and the caller must not persist it.
 */
export async function mintGateCookies(email, env = loadEnv()) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    throw new Error('need NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY')
  }

  // 1. service_role → a single-use magiclink hash. No mail is sent.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  // Supabase errors are Error subclasses with non-enumerable properties — log the fields, never
  // the raw object (CLAUDE.md: logging the raw object serializes to `{}`).
  if (linkErr) throw new Error(`generateLink failed: ${linkErr.message} (${linkErr.status ?? '?'})`)
  const tokenHash = link?.properties?.hashed_token
  if (!tokenHash) throw new Error('generateLink returned no hashed_token')

  // 2. anon → exchange the hash for a real session.
  const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  })
  if (verifyErr) throw new Error(`verifyOtp failed: ${verifyErr.message} (${verifyErr.status ?? '?'})`)
  const session = verified?.session
  if (!session?.access_token) throw new Error('verifyOtp returned no session')

  // 3. Re-encode through @supabase/ssr so the cookie shape is the app's, not our guess.
  const jar = new Map()
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (toSet) => {
        for (const { name, value } of toSet) {
          // An empty value is a delete instruction, not a cookie worth injecting.
          if (value === '') jar.delete(name)
          else jar.set(name, value)
        }
      },
    },
  })
  const { error: setErr } = await ssr.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (setErr) throw new Error(`setSession failed: ${setErr.message}`)
  if (jar.size === 0) throw new Error('setSession wrote no cookies — @supabase/ssr format may have changed')

  return {
    cookies: [...jar.entries()].map(([name, value]) => ({ name, value })),
    userId: session.user?.id ?? '',
    host: new URL(url).host,
  }
}

// Standalone: prove a mint works without printing anything sensitive. Cookie NAMES and byte
// lengths only — never a value, never a token.
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('session.mjs')) {
  const email = process.argv[2]
  if (!email) {
    console.error('usage: node scripts/gate/session.mjs <email>')
    process.exit(1)
  }
  mintGateCookies(email)
    .then(({ cookies, userId, host }) => {
      console.log(`✓ minted a session for ${email}`)
      console.log(`  user id : ${userId}`)
      console.log(`  host    : ${host}`)
      for (const c of cookies) console.log(`  cookie  : ${c.name} (${c.value.length} bytes, value withheld)`)
    })
    .catch((e) => {
      console.error(`✗ ${e.message}`)
      process.exit(1)
    })
}
