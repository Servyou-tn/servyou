# Brief — English, freelancer area (Role: page-builder, translation job)

You are the **Freelancer agent**. Job: write the English text of **everything freelance (profile wizard and edit, services, missions board and detail, proposals, engagements, freelancer dashboard, « devenir freelance ») and the client side of those journeys (browsing services and freelancers, posting and managing a job post / annonce)**.
About **1239** strings. Read `docs/i18n-en/README.md` first: the plan, the ownership table, the rules and the locked glossary.

## Setup (PowerShell, once)
```
cd C:/Users/Zolo/Projects/servyou
git fetch origin
git worktree add C:/Users/Zolo/Projects/servyou-wt-en-free -b feat/i18n-en-freelancer origin/main
cd C:/Users/Zolo/Projects/servyou-wt-en-free
npm ci
Copy-Item C:/Users/Zolo/Projects/servyou/.env.local .env.local
```
Then prefix EVERY shell command with `cd "C:/Users/Zolo/Projects/servyou-wt-en-free" &&` and use absolute paths under the worktree.
First command: `git branch --show-current` must print `feat/i18n-en-freelancer`. Never touch the main checkout or the other agent's worktree.

## Skills
Load `servyou-i18n-vocabulary-lock` (vocabulary + bidi rules). Its « no English strings » rule is about `fr.ts`; for this
job English goes ONLY into `src/lib/i18n/en/freelancer.ts`. Use the page-builder « Fast loop » for checks.

## Steps
1. List your work: `$env:EN_OWNER="freelancer"; npx vitest run src/lib/i18n/en.coverage.test.ts --silent=false --reporter=verbose`.
2. Translate in batches of one prefix at a time (open the French block in `fr.ts`, write the same keys in
   `src/lib/i18n/en/freelancer.ts`; plurals from `src/lib/i18n/plurals.ts` go in the `plurals` object with `one` / `other`).
   Keep the file grouped by prefix, in the same order as `fr.ts`, one comment line per prefix.
3. After each batch: `npx vitest run src/lib/i18n/en.test.ts` (wrong owner, unknown key, changed placeholder) and
   `npx tsc --noEmit`.
4. Push commit 1 as soon as the strings are done (or the first big part): `git push -u origin feat/i18n-en-freelancer`, open the PR,
   and let CI run while you check pages.
5. Look at the pages in English: `npx next dev -p 3200`, cookie `servyou_lang=en` (set it with the FR | EN | AR switch).
   Signed-out pages of your area: /trouver-des-missions, /missions/<id>, /services, /freelance/<id>, /devenir-freelance, /marche/services. Look for French left over, text cut off or overflowing at 375 and 1440, a
   locale written by hand. Do NOT sign in with any account (ask the founder if a signed-in page needs a look).
6. Code fixes only inside your own routes (README rule 6) = commit 2. Anything in shared components → a new file
   `docs/follow-ups/i18n-en-freelancer.md` (format in `docs/follow-ups/README.md`).
7. One review of the diff by a **Sonnet** subagent; fix critical/high findings = commit 3.
8. CI green (`gh pr checks <n>`), coverage for `freelancer` at 100 %, then report and STOP. The founder merges.

## PR body
What ships / Changes / Decisions (every glossary gap you filled) / Out of scope / Verification (coverage numbers,
en.test.ts, pages looked at) / Follow-ups.

## Never
Edit `fr.ts`, `ar.ts`, `plurals.ts`, `index.ts`, `ownership.ts`, `en/common.ts` or the other agent's file · translate
`admin.*` · write « verified », « secure payment », escrow or invented numbers · add AI attribution or Co-Authored-By ·
force-push or push to main · run rls-smoke · write or apply a migration.
