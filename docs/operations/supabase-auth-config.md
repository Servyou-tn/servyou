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

## Current production values (2026-11-16, after the domain switch and the two-step sign-up)

The Supabase dashboard holds these; the founder sets them (the Supabase MCP cannot read Auth settings).

- **Site URL:** `https://servyou.tn`, written **without** a trailing slash (the e-mail templates below depend on it).
- **Redirect URLs:**
  - `https://servyou.tn/**` (production: `/auth/confirm` for the sign-up and sign-in links, `/nouveau-mot-de-passe` for
    the reset link, `/verifier-email` for links sent before the two-step sign-up);
  - `http://localhost:*/**` (local development, any port; each worktree runs its own).

In a pattern, `*` matches anything but `.` and `/`, and `**` matches anything (query strings included).

**No wildcard for the Vercel previews — on purpose.** The sign-up and sign-in links now carry their one-time token
straight to the Redirect URL. Anyone can ask Supabase for a link to any address and pick any allow-listed redirect, so a
pattern like `https://*-servyou-s-projects.vercel.app/**` would let someone who obtains a matching Vercel host (a team or
project slug ending that way) receive a victim's token and sign in as them. A preview is not on the list, so its links
fall back to the Site URL: the templates' `{{ if }}` then builds the production link, and the account opens on
production. Add an EXACT preview URL only for a short test, and remove it after.

## The e-mail templates (two-step sign-up)

Every sign-up and sign-in link now lands on `/auth/confirm`, which verifies it on the server, so it works on any device
(`src/app/auth/confirm/route.ts`). Step 1 is a passwordless link (`signInWithOtp`): a new address gets « Confirm
signup », an existing account « Magic Link ». The other templates (reset password, e-mail change) are unchanged.

### Template 1 — « Confirm signup » (a NEW account: step 1 of the sign-up, or a new link for an unconfirmed address)

**Subject:** `Finalisez votre inscription à Servyou`

```html
<h2>Bienvenue sur Servyou</h2>
<p>Pour finaliser votre inscription, ouvrez ce lien. Vous choisirez ensuite votre mot de passe.</p>
<p><a href="{{ if eq .RedirectTo .SiteURL }}{{ .SiteURL }}/auth/confirm?next=%2F&token_hash={{ .TokenHash }}&type=email{{ else }}{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email{{ end }}">Finaliser mon inscription</a></p>
<p>Si vous n'avez pas demandé à créer un compte Servyou, ignorez cet e-mail.</p>
<hr>
<p dir="rtl">مرحبًا بك في Servyou. لإكمال تسجيلك افتح الرابط أعلاه، ثم اختر كلمة المرور.</p>
<p>Welcome to Servyou. To finish signing up, open the link above, then choose your password.</p>
```

### Template 2 — « Magic Link » (an EXISTING account: its e-mail typed on the sign-up page, or « Recevoir un nouveau lien »)

**Subject:** `Votre lien de connexion Servyou`

```html
<h2>Votre lien de connexion Servyou</h2>
<p>Vous avez déjà un compte Servyou avec cette adresse. Ouvrez ce lien pour vous connecter :</p>
<p><a href="{{ if eq .RedirectTo .SiteURL }}{{ .SiteURL }}/auth/confirm?next=%2F&token_hash={{ .TokenHash }}&type=email{{ else }}{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email{{ end }}">Me connecter</a></p>
<p>Si vous n'avez pas finalisé votre compte, le lien vous y conduit. Si vous n'avez rien demandé, ignorez cet e-mail.</p>
<hr>
<p dir="rtl">لديك حساب في Servyou بهذا العنوان. افتح الرابط أعلاه لتسجيل الدخول.</p>
<p>You already have a Servyou account with this address. Open the link above to sign in.</p>
```

**Why the `{{ if }}`:** the app always asks for `<origin>/auth/confirm?next=…`, so the link is that address plus
`&token_hash=…&type=email`. If the origin is not on the Redirect URLs list, Supabase replaces it with the Site URL; the
`{{ if }}` then builds the production link instead of a broken `https://servyou.tn&token_hash=…`. It needs the Site URL
written **without a trailing slash** (`https://servyou.tn`).

**Order on deploy day** (pasting the templates before the deploy would break today's sign-ups):
1. deploy the app;
2. paste the two templates;
3. check the Redirect URLs above;
4. sign up once with a team address (until Brevo is live, Supabase mails only the project team's own addresses);
5. apply DB-2 the same day.

Before the templates are pasted, the default « Confirm signup » link still works on the device that asked for it:
`/auth/confirm` also exchanges the `?code=` GoTrue's own link brings back.

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

- **2026-11-16** — Two-step sign-up (UI-1): sign-up and sign-in links go to `/auth/confirm`; the « Confirm signup » and
  « Magic Link » templates are rewritten (above); localhost (any port) is added; the Vercel previews are deliberately
  NOT added (see « No wildcard for the Vercel previews »). `/verifier-email` keeps working for links sent before.
- **2026-06-14** — Redirect URL whitelist migrated from `/update-password` to
  `/nouveau-mot-de-passe` as part of the auth route migration (legacy auth routes
  rebranded to French names; old paths kept as permanent 308 redirects in
  `next.config`). The old `/update-password` entry was removed once the new page
  was live and whitelisted.
