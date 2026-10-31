# Preview check — the session refresh is saved (`fix/session-refresh-persistence`)

A signed-in click-through for the founder, on the PR's Vercel **preview** (Turnstile may challenge a headless browser,
so a person does it). About 10 minutes. Desktop Chrome or Edge, a normal (not private) window.

A session's access token lasts one hour. Instead of waiting, step 4 makes the browser's copy look expired (a console
snippet that only moves the expiry time in your own cookie — the token itself is untouched), which forces the same
refresh that happens after an hour.

## Steps
1. Open the PR's preview URL (the Vercel bot comment on the PR) and go to **/connexion**. Sign in with a real account
   (email + password). If Turnstile shows a challenge, solve it.
2. Open **/mes-commandes** (or your dashboard). DevTools (F12) → **Application** → **Cookies** → the preview's origin.
   Note the `sb-…-auth-token` cookie(s) (possibly split into `.0`, `.1`) — each has **Secure** ✓ (#257, unchanged).
3. DevTools → **Console**. Paste the snippet below and press Enter. It prints `expires_at moved: <old> → <new>`.
4. Without reloading, click a link to another signed-in page (e.g. **Mon compte** in the user menu).
   - DevTools → **Network** → the request for that page (filter « Doc » or « Fetch/XHR ») → **Response Headers**:
     `set-cookie: sb-…-auth-token…` is present ← the refresh is now SAVED (the change under test);
   - **Application → Cookies**: the `sb-` cookie value changed, still **Secure** ✓;
   - you are still signed in (your name in the user menu, the page's content).
5. Click two or three more pages: still signed in, and **no** further `set-cookie: sb-…` on those responses (the saved
   session is reused, not refreshed again).
6. Switch the language to العربية, repeat steps 3–5 once: same result, the page in Arabic.
7. Sign out (user menu → Se déconnecter): every `sb-` cookie disappears; **/mon-compte** sends you to /connexion.

### Console snippet (step 3)
```js
(() => {
  const all = Object.fromEntries(document.cookie.split('; ').map((c) => [c.slice(0, c.indexOf('=')), c.slice(c.indexOf('=') + 1)]))
  const base = Object.keys(all).find((n) => /^sb-.+-auth-token(\.0)?$/.test(n)).replace(/\.0$/, '')
  const raw = all[base] ?? Object.keys(all).filter((n) => n.startsWith(base + '.')).sort((a, b) => +a.split('.').pop() - +b.split('.').pop()).map((n) => all[n]).join('')
  const b64 = (s) => s.replace(/-/g, '+').replace(/_/g, '/')
  const session = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64(decodeURIComponent(raw).replace(/^base64-/, ''))), (c) => c.charCodeAt(0))))
  const before = session.expires_at
  session.expires_at = Math.floor(Date.now() / 1000) - 60
  const bytes = new TextEncoder().encode(JSON.stringify(session))
  const value = 'base64-' + btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const attrs = '; path=/; max-age=34560000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '')
  Object.keys(all).filter((n) => n === base || n.startsWith(base + '.')).forEach((n) => (document.cookie = n + '=; path=/; max-age=0'))
  for (let i = 0; i * 3180 < value.length; i++) document.cookie = `${base}.${i}=${value.slice(i * 3180, (i + 1) * 3180)}${attrs}`
  console.log('expires_at moved:', before, '→', session.expires_at)
})()
```

## Pass / fail
- **Pass:** step 4 shows `set-cookie: sb-…` on the next page and you stay signed in; step 5 shows no further
  `set-cookie: sb-…`; steps 6–7 behave as written.
- **Fail:** sent to /connexion or /session-expiree at step 4 or 5, or no `set-cookie` at step 4 — don't merge; send a
  screenshot of the Network response headers and of the cookie table.

Before this change, step 4 would ALSO keep you signed in (the server refreshed in memory) but send no `set-cookie`, and
every following page would refresh again with the same, already-used token — until, past Supabase's reuse window, the
session was revoked (a logout « out of nowhere »).
