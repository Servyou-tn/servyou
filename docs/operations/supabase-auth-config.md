# Supabase Auth — URL Configuration runbook

This is the runbook for Servyou's Supabase Auth **URL Configuration**: what it
controls, the values it holds today, and how to change them without breaking
password-reset email links. It exists because this configuration lives outside
the codebase — it is set in the Supabase dashboard, not in any file in this
repo — so nothing in `npm run build` or the test suite can catch a mistake here.
If a real user ever clicks a reset link and lands on a 404, this is the first
page to read.

## What this configuration controls

Supabase Auth has two URL settings that together decide where authentication
emails send people:

The **Site URL** is the default origin Supabase uses when it builds a link in an
email and the code did not pass an explicit redirect target. It is the fallback
base for confirmation and recovery links.

The **Redirect URLs** whitelist is the allow-list of full URLs that Supabase will
honour as a `redirectTo` target. Our password-reset code calls
`resetPasswordForEmail(email, { redirectTo: \`${origin}/nouveau-mot-de-passe\` })`,
and Supabase only emits that link if the resolved URL is on this whitelist. An
origin or path that is not whitelisted is silently rejected and the user gets a
broken or fallback link. This is the setting that matters most.

## Current production values

As configured in the Supabase dashboard today:

- **Site URL:** `http://localhost:3000`
- **Redirect URLs:**
  - `http://localhost:3000/nouveau-mot-de-passe`
  - `https://servyou.vercel.app/nouveau-mot-de-passe`

Note for launch: the Site URL still points at `localhost`. That is fine for the
current pre-launch build (reset links carry an explicit `redirectTo`, so the
whitelist is what actually governs them), but the Site URL should be repointed to
the production domain when the custom OVH domain goes live, and that domain's
`/nouveau-mot-de-passe` URL added to the whitelist at the same time.

## When to update these values

Update the URL Configuration any time a redirect-target route changes — for
example, renaming or moving the new-password page — and any time a new origin
starts serving the app, such as a custom domain replacing the `vercel.app` host.
Critically, update it **before** deleting or renaming the old route, not after,
so there is never a window where the live whitelist points at a route that no
longer exists.

## How to update them

Go to the Supabase dashboard → **Authentication** → **URL Configuration**. Use the
**add-before-remove** pattern: first add the new redirect URL to the whitelist and
save, confirm reset emails resolve to the new page, and only then remove the old
entry. Adding first means in-flight reset emails that still embed the old URL keep
working through the transition; removing first opens a gap where some users hit a
dead link. Treat the whitelist as append-then-prune, never swap-in-place.

## Why this matters

Password-reset emails embed these URLs at send time. A stale or missing whitelist
entry does not fail loudly — it produces a 404 (or a silent fallback) for a real
person who is already locked out of their account and trying to get back in. The
test suite cannot catch this, because the configuration is external Supabase state
with no representation in the repository. The only safeguards are this runbook and
the discipline of updating the whitelist before changing a route.

## Migration history

- **2026-06-14** — Redirect URL whitelist migrated from `/update-password` to
  `/nouveau-mot-de-passe` as part of the auth route migration (legacy auth routes
  rebranded to French names; old paths kept as permanent 308 redirects in
  `next.config`). The old `/update-password` entry was removed once the new page
  was live and whitelisted.
