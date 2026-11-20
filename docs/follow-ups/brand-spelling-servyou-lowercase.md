# Brand spelling « Servyou » — what the code change could not reach (`chore/brand-spelling-servyou-lowercase`, 2026-11-20)

The founder decided on 2026-11-20 that the brand is written « Servyou » (capital S only). This PR reverses the
« ServYou » spelling of #397 in every string the repo holds. The logo and every image are unchanged. The places below live
outside the repo, so the founder does them with the architect.

## 1. The Supabase Auth e-mails and the SMTP sender name

- **What:** the brand text of the three Supabase Auth e-mails (« Confirm signup », « Magic Link », « Reset Password »)
  and the SMTP sender name.
  - « Confirm signup » and « Magic Link »: paste templates 1 and 2 again from
    `docs/operations/supabase-auth-config.md`. This PR corrected their text to « Servyou ».
  - « Reset Password »: its text lives only in the dashboard. Change any « ServYou » there.
- **Why deferred:** they are dashboard settings, not repo files.
- **Where it lives:** the Supabase dashboard of project `xggomcitqrkaylqezjjz`, in Authentication › Email Templates
  and Authentication › SMTP Settings (sender name).
- **Trigger:** now, after this PR merges.

## 2. Brevo's sender name

- **What:** the sender name Brevo shows in the recipient's inbox.
- **Why deferred:** a Brevo account setting.
- **Where it lives:** the Brevo dashboard, under Senders.
- **Trigger:** now, together with item 1, so every e-mail carries the same name.
- **Also:** `docs/follow-ups/notifications-v2-plan.md` (line 333) specifies the sender `ServYou <no-reply@servyou.tn>`.
  That file is a dated record and stays as written. The notifications v2 build must use « Servyou ».

## 3. The Google OAuth app name

- **What:** the app name on Google's consent screen.
- **Why deferred:** a Google Cloud setting. Google sign-in is built but switched off (`ENABLE_GOOGLE_OAUTH = false`), so
  nobody sees it today.
- **Where it lives:** Google Cloud console › APIs & Services › OAuth consent screen › App name.
- **Trigger:** before Google sign-in is switched on, or now.

## 4. Two external names that no user sees (optional)

- **What:** two names that are not user-visible still read « ServYou »:
  - the Figma file « ServYou — Design System », cited in `scripts/tokens/pull.mjs` (line 1) and `src/app/globals.css`
    (line 11);
  - the Umami website « ServYou », cited in `src/lib/analytics/umami.ts` (line 1).
  This PR left those three comments alone, because they name the artifact as it is called today.
- **Why deferred:** renaming them is the founder's choice. Neither name reaches a user.
- **Where it lives:** Figma and the Umami Cloud dashboard; the three comments above.
- **Trigger:** if either one is renamed, change its comment in the same step.

## 5. The earlier file, `brand-spelling-servyou.md` (#397), unchanged

- **Its item 1 is moot.** The database's provenance message already says « Servyou », which is now the right spelling, so
  no migration is needed.
- **Its item 2 (the Supabase e-mails)** is replaced by items 1 and 2 above.
- **Its item 3 is still open.** « Rechercher sur Servyou » in `src/components/marche/ExpandableSearch.tsx` is still
  hard-coded French. This PR fixed only its spelling; moving it into `t()` is still owed.
