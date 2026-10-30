# Preview check — Secure session cookies (`fix/auth-cookie-secure`)

A signed-in click-through for the founder, on the PR's Vercel **preview** (Turnstile may challenge a headless browser,
so a person does it). About 5 minutes. Desktop Chrome or Edge, a normal (not private) window.

## Steps
1. Open the PR's preview URL (the Vercel bot comment on the PR) and go to **/connexion**.
2. Sign in with a real account (email + password). The Turnstile widget is invisible; if it shows a challenge, solve it.
3. Open DevTools (F12) → **Application** → **Cookies** → the preview's origin. Look at every cookie whose name starts
   with `sb-` (the session may be split into `…-auth-token.0`, `…-auth-token.1`):
   - **Secure** column: ✓ on every `sb-` cookie ← the change under test;
   - **SameSite**: `Lax`; **HttpOnly**: empty (expected — the browser client reads it); **Path**: `/`.
4. Reload the page, then open **/mon-compte**: you are still signed in.
5. On /mon-compte → **Changer le mot de passe**: type a WRONG current password + any new password → you see
   « Le mot de passe actuel est incorrect. » (the server-side re-check still works; your password is NOT changed).
   Close the modal.
6. Switch the language to العربية and reload: still signed in.
7. Sign out (user menu → Se déconnecter): every `sb-` cookie disappears from DevTools, and opening **/mon-compte**
   sends you to /connexion.

## Pass / fail
- **Pass:** step 3 shows Secure ✓ on every `sb-` cookie, and steps 4–7 behave as written.
- **Fail:** anything else — don't merge; send a screenshot of the DevTools cookie table.

After the merge, steps 1–3 on https://servyou.vercel.app confirm production (an existing session keeps its old,
non-Secure cookies until its next refresh or sign-in rewrites them).
