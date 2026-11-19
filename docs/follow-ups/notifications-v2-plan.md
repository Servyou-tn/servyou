# Notifications v2 (e-mail + new kinds): discovery and plan (`docs/notifications-v2-plan`, 2026-11-19)

**New document.** Its input is the founder-approved research « Notifications v2 : qui est prévenu de quoi » (Nov 18,
2026; `figma-dumps/exports/notifications-v2/research.md`, outside the repo). The research sets who is told what, the
matching rule, the delivery rules and 7 decisions. This plan turns that into schema, jobs and PRs.

- **Discovery** was read-only on production (`execute_sql` SELECTs, 2026-11-19) and on the code at `a3c3c40` (main after
  #401).
- **Nothing is applied:** no migration file, no live write, no deploy. SQL here is limited to columns and signatures. The
  DB PRs write the `PENDING_` files.
- **Follow-ups** found on the way are in `docs/follow-ups/notifications-v2-followups.md`.

## Decisions (founder, 2026-11-19: all decided)

The architect approved the plan in substance on 2026-11-19, and the founder answered every question the same day. The
rest of this document already follows these answers.

### From the research: confirmed as recommended

1. **D1 (match rule):** at least one skill in common **or** an active service in the mission's category.
2. **D2 (mission e-mail):** a daily digest at 09:00 by default, with weekly and off also available.
3. **D3 (bell cap):** 10 mission alerts a day, then one grouped row.
4. **D4 (skip):** freelancers already at 5 active proposals are skipped.
5. **D5 (low stock):** 2 units or fewer. **It stays blocked:** Q2 decided no stock alerts for now.
6. **D6 (buyer toggle):** a new « Suivi de mes commandes » toggle, on by default.
7. **D7 (timing):** before launch, order e-mails and mission alerts; just after launch, moderation and digest polish.
   Stock is out until Q2 changes.

### From discovery: decided

1. **Q1 (Brevo quota):** the free plan sends 300 e-mails a day.
   - Brevo **already** carries the Supabase Auth SMTP: the domain is authenticated, SPF / DKIM / DMARC pass, and the
     first password-reset e-mail has gone out.
   - So the 300 a day are shared **now** with sign-up and sign-in links, and a 09:00 digest could use up the day before
     a sign-up link goes out.
   - **Decided:**
     - from the start, the sender keeps a daily budget of 200, leaving 100 for Auth;
     - instant mail goes before digests;
     - before launch, the founder moves Brevo to a paid plan (Starter, no daily cap). That is a founder action (§8).
2. **Q2 (stock has no event):** nothing lowers `stock_count`.
   - Only the owner's product form writes it (`src/app/actions/products.ts`).
   - `enforce_order_insert_integrity` only refuses a quantity above the stock (Ruling 8). No order step lowers it.
   - So « stock fell to 2 » could only come from the owner's own edit, which the never-self rule forbids notifying.
   - **Decided: (a), no stock alerts for now.**
   - The wider question, when an order should lower the stock and when it should give it back, is logged for the founder
     in `notifications-v2-followups.md` §8.
3. **Q3 (who gets mission alerts):** the research said « a published profile ».
   - Live, `is_published` means « has at least one active service » (`sync_freelancer_is_published` →
     `freelancer_has_active_listing`).
   - Answering a mission does not need that.
   - **Decided: (b), everyone who can answer a mission.** That is the eligibility in
     `enforce_job_responder_capability`:
     - a `freelancer` seller;
     - aged 18 or over;
     - not suspended;
     - with a freelancer profile that is not hidden.
   - Published or not: a freelancer with skills but no service is matched by skill.
4. **Q4 (« Retenu » toggle):** **decided:** `email_proposals`.
   - Its label today is « Propositions reçues » (`rowsForRole`), which a freelancer would not read as « my proposal was
     retained ».
   - So V2-UI-1 rewords the label for the freelancer variant.
5. **Q5 (suspended recipients):** **decided:**
   - a deleted account (tombstone) never gets an e-mail;
   - a suspended account gets only moderation e-mails;
   - bell rows are still written.
6. **Q6 (digest and the bell):** **decided:** an item already read in the bell is left out of the digest. Overflow
   missions are the exception (G2).
7. **Q7 (weekly day):** **decided:** weekly digests go out on Monday at 09:00 (Tunis).
8. **Q8 (events the research does not cover):** **decided:** none of these sends a notification.
   - A freelancer withdraws a pending proposal.
   - A closed mission is re-opened (`not_chosen` → `pending`).
   - A mission expires at 30 days (no status is written, see §1).
   - Content is un-hidden, or an account un-suspended.
   - A mission's skills are edited after it is published. This one only re-runs the matching (§4.2).
9. **Q9 (what an e-mail shows):** e-mails leave RLS. **Decided:**
   - the item or mission title, the status and a link to the page;
   - never a delivery address, a phone number or the other party's contact details.
10. **Q10 (where the sender runs):** **decided:** a Supabase Edge Function (§3.3).
11. **Q11 (retention):** **decided:**
    - e-mail rows: sent or skipped kept 30 days, failed kept 90 days;
    - mission-alert rows: kept 60 days;
    - bell rows: read rows kept 90 days. This is v1 D2's job, built here.
12. **Q12 (title snapshot):** **decided: yes.** v2 bell rows about a mission store its title at the time of the event,
    like an order's `item_title` snapshot.
    - Without it, « mission supprimée » and « non retenu » would become unreadable.
    - The reason: a responder loses read access to a deleted or hidden mission (§1).
13. **Q13 (alert delay):** **decided:** mission alerts reach the bell 2 to 3 minutes after publishing, not « Instant »
    as in the research.
    - The skills arrive in a second request (§4.2), hence a 2-minute queue delay, then the next minute's run.
14. **Q14 (closing twice):** a poster can close a mission, re-open it and close it again.
    - Each close turns `pending` into `not_chosen`, while a re-open sends nothing (Q8).
    - **Decided:** « mission fermée » and « non retenu » are sent at most once per proposal. A second close adds nothing.
15. **Q15 (digest length):** **decided:** 20 items per section, then « et N autres ».
16. **Q16 (skill autocomplete):** **decided:**
    - a spelling is suggested only once at least 2 different accounts use it;
    - hidden, suspended and tombstone accounts never count.

### Two rules written in at the end of review

- **G1 (« first proposal »):** a proposal is the first on its mission when its insert of the dedupe key
  `first_proposal:<job_post_id>` **really creates a row** (`on conflict do nothing returning`).
  - Every other proposal becomes a digest item.
  - Two tests are deliberately not used:
    - `response_count = 1`: AFTER triggers fire in name order (§2), so it can read a stale count.
    - « No other proposal exists »: after a withdrawal, proposal 2 would count as first. Its e-mail would then hit the
      existing key, and it would also miss the digest.
- **G2 (overflow missions):** every mission counted in a `mission_match_overflow` row always appears in the digest.
  - Those missions have no bell row of their own, so reading the overflow row does not remove them (Q6 does not apply).
  - The digest is the only place that lists them.

## 1. What is live today

Production state, read-only (2026-11-19):

- **`notifications` (v1, migration `20261116201553`):**
  - 0 rows.
  - `actor_id`, `order_id` and `to_status` are NOT NULL.
  - CHECKs: `notifications_kind_check` allows 2 kinds; `notifications_kind_shape`; `notifications_never_self`.
  - RLS « Recipients read their notifications »; authenticated SELECT only.
  - Written by `notify_order_counterparty()`, whose INSERT is in its own block: an error becomes a WARNING.
- **`notification_preferences`:**
  - 0 rows, so everyone has the column defaults.
  - Defaults: `email_new_orders` true, `email_proposals` true, `email_reviews` true, **`email_low_stock` false**,
    `email_missions_matching` true, `email_newsletter` false.
  - Column-level INSERT / UPDATE grants for authenticated, with the matching entry in `db/client-write-allowlist.json`.
  - The app reads it in `src/lib/notifications/prefs.ts`:
    - `rowsForRole` gives the consumer « propositions · sécurité · newsletter »;
    - « Alertes de sécurité » is a locked row with no column.
- **No e-mail sender exists in the app.**
  - No Brevo / SMTP client exists in `src/`.
  - `src/app/(marketing)/contact/actions.ts` says e-mailing the founder comes later.
  - **Brevo already carries the Supabase Auth SMTP** on `servyou.tn` (architect, 2026-11-19):
    - the domain is authenticated, and SPF / DKIM / DMARC pass;
    - the first password-reset e-mail has gone out.
  - Production is `https://servyou.tn` since #379 (merged 16 Nov). `servyou.vercel.app` 308-redirects there.
- **Platform:**
  - Supabase is on the **Free plan**, Postgres 17.6.
  - Extensions: `pg_cron` 1.6.4, `unaccent` (in `public`, with an IMMUTABLE wrapper `public.f_unaccent`) and
    `supabase_vault` (0 secrets).
  - **`pg_net` is available but not installed.**
  - No Edge Function is deployed.
  - One cron job runs: `purge-unconfirmed-signups` at `17 3 * * *`.
  - **`cron.timezone` is GMT.**
  - On Vercel, `vercel.json` defines no crons.
- **Missions (`job_posts`):**
  - Status is `open|filled|expired|deleted`, and an insert is always `open` (`enforce_job_post_writes`).
  - The owner may move it open ↔ filled within 30 days; `deleted` is terminal.
  - **`expired` is never written:** expiry is computed (`created_at` older than 30 days) in RLS and in the checks.
  - Caps: 5 open in 30 days and 10 per 24 h per poster (`enforce_job_post_cap`).
  - **Skills arrive in a second request.**
    - `createAnnonce` (`src/app/mes-annonces/nouvelle/actions.ts`) inserts the mission, then `job_post_skills`
      separately. A failed skills insert is non-fatal.
    - Skills stay editable until the first proposal (`enforce_job_post_skills_lock`, `/mes-annonces/[id]/modifier`).
- **Proposals (`job_responses`):**
  - Status is `pending|chosen|not_chosen`.
  - `check_job_response_limits` applies two caps:
    - 10 per mission, through `job_posts.response_count`;
    - 5 active per freelancer: proposals on missions that are open, not hidden, at most 30 days old, with a poster who
      is not suspended.
  - `choose_job_response` sets one `chosen`, the rest `not_chosen`, and the mission `filled`.
  - `sync_job_responses_on_post_status`:
    - leaving `open` turns `pending` into `not_chosen`;
    - a re-open turns `not_chosen` back into `pending`.
  - A withdrawal is a DELETE while `pending`. `response_count` then goes down (`sync_job_post_response_count`).
- **Skills:**
  - `freelancer_skills.skill` and `job_post_skills.skill` are free text, with no normalised column.
  - Authenticated has table-level INSERT / DELETE / SELECT on both.
  - The app's key is `skillKey()` (`src/lib/marche/skills-match.ts`): NFD, combining marks stripped, `fr` lower-case,
    spaces collapsed.
- **Categories:** missions (6 of 6) and services (23 of 23) use top-level categories. Services also have a
  `subcategory_id`.
- **Moderation:**
  - `admin_hide_content(target_type, target_id, reason)` covers product, service, shop, freelancer_profile and job_post.
  - Accounts: `admin_suspend_user`, and the unhide / unsuspend functions.
  - Reports are decided by an admin UPDATE: policy « Admin updates reports », `src/app/admin/signalements/actions.ts`.
- **Who can read what:**
  - « Responders read the posts they answered » requires `status <> 'deleted'` and not hidden.
  - Open missions are readable for 30 days.
  - A reporter reads their own reports; owners read their own hidden listings.
- **Account deletion (`admin_process_deletion_request`, after #398):**
  - Step (a) deletes favorites, preferences and the notifications the person received.
  - Later steps hide the listings, set the person's missions to `deleted` and turn the profile into a tombstone:
    - e-mail `supprime-<id>@deleted.servyou.invalid`;
    - `suspended_at` set.
  - **The profile row is kept, so `on delete cascade` from `profiles` never fires on this path.**
- **`profiles.language`:** `fr|ar|en`, default `fr` (live: 11 fr, 2 en, 1 ar).
- **Volumes:**
  - 14 profiles: 10 freelancers, 1 shop owner, 3 consumers.
  - 10 freelancer profiles, all published, with 21 active services.
  - **3 freelancer skill rows, all on 1 profile.**
  - 8 missions between 2026-06-04 and 2026-10-26: about 1.5 a month, 2 in the last 30 days, at most 5 in one day. They
    have 4 skill rows.
  - 4 proposals.
  - 16 orders, the last on 2026-08-10.
  - 25 stock-tracked products, 0 at 2 or fewer.
  - 7 of the 14 auth users have a `last_sign_in_at`.

## 2. Who is told what (v2), mapped to the database

**Rules for every event:**
- The other person is told, never the actor (the v1 rule).
- No signed-in actor means no row, except system events, whose actor is NULL by design (mission alerts, overflow rows).
- **A tombstone recipient gets no row in any table.**
  - A tombstone is an account with an approved deletion request: `private.is_tombstone(uuid)` checks
    `deletion_requests.status = 'approved'`.
  - That is not the same as « suspended ». A tombstone is also suspended, but Q5 still mails suspended accounts their
    moderation e-mails.
- **Every emitter writes its rows inside its own `begin … exception when others` block**, with the bell row and the
  e-mail row each in a separate block.
  - Any error becomes a WARNING and no row (the v1 architect rule).
  - This covers the order trigger, the proposal triggers and the code added inside `admin_hide_content` /
    `admin_suspend_user`.
  - So a notification never rolls back an order, a proposal, a choice or a moderation action (« never block the
    action »).
- **No v2 trigger may depend on another trigger having run first.**
  - Postgres fires the AFTER triggers of one table in name order.
  - A `trg_notify_*` trigger on `job_responses` would run before `trg_sync_job_post_response_count` and read the old
    count.

| Event | Where it is caught | Recipient | Bell kind | E-mail |
|---|---|---|---|---|
| New order, order status change (v1) | `notify_order_counterparty` (exists) | the other party | `order_created`, `order_status_changed` (v1) | Instant. The seller's events use `email_new_orders`: new order, receipt confirmed, buyer cancel. The buyer's use `email_order_updates` (new): accepted → arrived, cancelled or refused. |
| New proposal | `job_responses` AFTER INSERT | the poster | `proposal_received`, grouped per mission within an hour | The first proposal on a mission is instant; the rest go to the digest (`email_proposals`) |
| Mission reaches 10 proposals | `job_posts` AFTER UPDATE OF `response_count`, when it goes from below 10 to 10 | the poster | `mission_full`, once per mission | — |
| « Retenu » | `job_responses` AFTER UPDATE OF status, `pending → chosen` | the freelancer | `proposal_chosen` | Instant (Q4) |
| « Non retenu » | `pending → not_chosen` while another proposal is `chosen` | the freelancer | `proposal_not_chosen` | — |
| Mission closed or deleted | `pending → not_chosen` with no proposal chosen (closed, or `deleted`) | the freelancer | `mission_closed` | — |
| Matching mission | queued fan-out (§4) | matched freelancers | `mission_match` (max 10 a day), then `mission_match_overflow` | Digest (daily, weekly or off) |
| Listing hidden, account suspended | **inside** `admin_hide_content` / `admin_suspend_user` | the owner | `content_hidden`, `account_suspended` | Instant, always on |
| Report decided | `reports` AFTER UPDATE OF status → `resolved` / `dismissed` | the reporter | `report_decided` | — |
| Low stock, sold out | not built: Q2 (a) | — | — | — |
| Password or e-mail changed | Supabase Auth security notifications | the user | — | Instant, sent by Supabase Auth (§5.4) |

## 3. Order e-mails first (launch blocker 1)

### 3.1 The flow

1. **In the order transaction:** `notify_order_counterparty` writes the bell row in its block, as today.
   - It then writes the e-mail row in a **second, separate block**. Each block turns any error into a WARNING.
   - So a failed e-mail row never drops the bell row, and neither ever rolls back the order (the v1 rule).
2. **After the commit, every minute:**
   - a `pg_cron` job checks for due e-mail rows, or rows left in `sending` for more than 10 minutes (a crashed run);
   - only if some exist, it calls the sender through `pg_net` with a shared secret.
3. **The sender (§3.3):**
   1. claims up to 50 rows;
   2. renders each in the recipient's language;
   3. calls Brevo `POST /v3/smtp/email`;
   4. settles each row.

### 3.2 The outbox: `private.email_outbox`

**Columns:**
- `id uuid`: also Brevo's idempotency key;
- `recipient_id` (FK `profiles`, cascade);
- `template`: a CHECKed list;
- `dedupe_key text unique`. An order e-mail uses `notif:<notification_id>`, so there is one e-mail per bell row; the
  other keys are in §5.1 and §6;
- `notification_id` (FK, `on delete set null`);
- `payload jsonb`: ids and keys only;
- `priority smallint`: instant before digest;
- `status`: `pending|sending|sent|failed|skipped`;
- `attempts`, `next_attempt_at`, `claimed_at`, `sent_at`;
- `provider_message_id`;
- `last_error`: a code and a short message, never the payload or the key;
- `created_at`.

**The address and the language are not stored.** `claim_email_batch` reads `profiles.email` and `profiles.language` at
send time, so the outbox copies no personal data, and an e-mail change made before the send is honoured.

**Preferences are checked twice:**
- **At enqueue:** a disabled toggle means no row.
- **At claim:** a toggle switched off since then turns the row into `skipped`.

A missing preferences row means the column defaults, the same rule as `withDefaults()`. Moderation templates ignore
preferences.

**Who never gets mail:** a tombstone, always. A suspended account gets only moderation templates (Q5). One private helper,
`private.is_tombstone(uuid)`, is used everywhere.

**Claim and settle** live in `public`, so the Edge Function can reach them through PostgREST.
- They are SECURITY DEFINER, with EXECUTE for `service_role` only.
- The migration states `revoke execute … from public, anon, authenticated` explicitly. Default privileges are closed
  since migration 68, but the line makes the intent checkable.

- **`claim_email_batch(p_limit)`:**
  - takes due rows with `for update skip locked`, so two runs never take the same row;
  - marks them `sending` and adds an attempt;
  - takes back a row left in `sending` for more than 10 minutes (a crashed run).
- **`settle_email(p_id, p_outcome, p_provider_id, p_error)`:**

| Outcome | What happens to the row |
|---|---|
| 2xx | `sent` |
| 400 / 404 | `failed`, with no retry |
| 401 / 403 | `failed`, and the run stops: the key is the problem, reported to Sentry |
| 429 / 5xx / timeout | retried after 1, 5, 15, 60, then 240 minutes |
| After 5 attempts | `failed` |

**Delivery is at least once, not exactly once.**
- The outbox id is sent as Brevo's idempotency key (`idempotencyKey`, per Brevo's batch-sending guide).
- Brevo ignores a repeat only within its key lifetime, reported as 15 minutes in one Brevo page and 30 in another. The
  changelog page now returns 404; E-SEND checks the current figure.
- So a crash after the send but before the settle, retried after that lifetime, sends the e-mail twice. That is rare,
  and accepted.

**Logs:** Sentry gets counts and error codes, never an address, a body or the key.

### 3.3 Where the sender runs

| | **A. Edge Function + `pg_cron` + `pg_net`** | B. Vercel route called by `pg_cron` + `pg_net` | C. Vercel route + Vercel cron |
|---|---|---|---|
| Delay | 1 minute at most | 1 minute at most | **Hobby: once a day, ±59 min** (legacy Cron Jobs, [usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing)). Schedules: at most every 15 min with jitter ([CLI docs](https://vercel.com/docs/cli/schedules)). Never instant. |
| Brevo key | Supabase Edge Function secrets | Vercel env | Vercel env |
| Templates | a pure-TS module with its own FR / EN / AR strings | can reuse `src/lib/i18n` | same as B |
| Depends on | Supabase only: the data, the clock and the sender sit together | Supabase + Vercel + the public domain answering | Vercel |
| Limits | Free plan: 500,000 invocations a month, 150 s per call, 2 s of CPU ([limits](https://supabase.com/docs/guides/functions/limits), [pricing](https://supabase.com/docs/guides/functions/pricing)). Called only when rows are due, so at most 43,200 a month. | Hobby function limits; Hobby is meant for non-commercial use | — |
| Deploy | outside CI: the architect deploys, like a migration | the usual Vercel deploy | the usual Vercel deploy |

**Recommendation: A.**
- C cannot send an order e-mail on time.
- B makes a Supabase job depend on Vercel and the domain.
- A keeps the Brevo key out of Vercel.

**The cost of A:**
- The templates are not the app's dictionary, so a test pins the shared labels to it (§3.4).
- The function is deployed by hand: its source lives in the repo, and the architect deploys it.

**The secrets:**
- The Brevo key is set by the founder in the Supabase function secrets: never in the repo, a chat or a log.
- The shared secret that the cron call sends goes in Vault (for the job) and in the function secrets (for the check).
- The function runs with `verify_jwt` off and compares the secret in constant time.

**Sender:** `ServYou <no-reply@servyou.tn>`. The display name « ServYou » follows
`docs/follow-ups/brand-spelling-servyou.md` and matches the Auth e-mails.

### 3.4 Templates and tooling

**Templates (Agent A):**
- One module per template in `supabase/functions/_shared/email/`:
  - pure TS, with no Deno API;
  - FR / EN / AR, picked from `profiles.language`;
  - Arabic in `dir="rtl"`;
  - a subject, a text part and an HTML part.
- Links are built from a `SITE_URL` function secret, `https://servyou.tn` from the start (production since #379).
- The link rules copy `bellHref()`, with a parity test, because the function cannot import the app.

**Unsubscribe links (to confirm in E-SEND):**
- Digest e-mails set **our own** `List-Unsubscribe`, pointing to Paramètres → Notifications.
- **Brevo also adds its own `List-Unsubscribe` header** to the mail it relays; we saw it on our Auth e-mails.
- What a click on Brevo's link does to transactional mail is **not yet known**. If it puts the address on Brevo's
  transactional blocklist, a user who « unsubscribes » from a digest would stop receiving order e-mails **and**
  sign-in links.
- E-SEND must:
  - find out what that click does;
  - make sure a digest unsubscribe cannot block instant, order or Auth mail, or else document how to unblock an address;
  - add a « Brevo blocked contacts » check to the runbook.

**Tooling:**
- `tsconfig.json` includes `**/*.ts`, so the function's Deno entry must be kept out of Next's `tsc`, eslint and vitest.
- The pure template modules stay in, so vitest can test them.
- E-SEND sets these excludes.

## 4. Mission alerts

### 4.1 Matching, in SQL

**The skill key:**
- A **stored generated column `skill_key`** on `freelancer_skills` and `job_post_skills`:
  `lower(public.f_unaccent(regexp_replace(btrim(skill), '<space class incl. U+00A0>+', ' ', 'g')))`, indexed.
- `f_unaccent` is IMMUTABLE, so it is allowed in a generated column.
- **It is not byte-identical to `skillKey()`:**
  - `unaccent` folds œ → oe, æ → ae and ß → ss, which the NFD strip does not;
  - the two regex engines differ on non-breaking spaces.
- The DB PR makes them agree: it adds the ligature folding to `skillKey()`, and a **parity test** pins both on a fixture
  list (é, É, œ, æ, ß, a non-breaking space, a curly apostrophe, Arabic).
- Without that test, an alerted freelancer could open the proposal form and find the skill not pre-selected.
- Arabic diacritics are folded by neither side (logged).

**One predicate per rule.** These become private helpers, called by both the fan-out and the existing triggers, so they
cannot drift apart:
- `private.job_post_is_live(job_posts)`: the « Open posts » rule. Open, not hidden, poster active, at most 30 days old.
- `private.active_proposal_count(freelancer)`: the exact count from `check_job_response_limits`. That trigger is changed
  to call it.

**Who is a candidate:** everyone who can answer a mission (Q3 b), published or not.
- The eligibility of `enforce_job_responder_capability` moves into `private.can_answer_missions(uuid)`, called by both
  that trigger and the fan-out. It requires:
  - seller type `freelancer`;
  - not suspended;
  - aged 18 or over;
  - a freelancer profile that exists and is not hidden.
- And also:
  - not the poster;
  - not a tombstone;
  - not already alerted for this mission.

**A match:** at least one shared `skill_key`, **or** an active, non-hidden service whose `category_id` is the mission's.
A mission with neither a category nor skills alerts nobody: 2 of the 8 live missions have no category.

**Skipped:** freelancers with `active_proposal_count` of 5 or more.

**The mission must still be live:** live by `job_post_is_live`, with `response_count` under 10.

**Ranking:**
1. most shared skills;
2. then category-only matches;
3. then most recently active: `auth.users.last_sign_in_at`, newest first, missing last, read inside the SECURITY DEFINER
   function;
4. then the profile id.

**Top 50 per mission, in total.**
- A run first counts the mission's existing `mission_alerts` and adds at most `50 − that count`.
- So a re-open, an unhide or a skill edit can fill the gap left by earlier runs, but can never alert more than 50
  freelancers for one mission.
- Without that count the cap would be per run, and closing and re-opening a mission would reach everyone.

### 4.2 Where it runs: a queue, not a trigger

The skills arrive in a second request (§1), so a trigger on the mission insert would always see none.

**The queue:** `private.mission_fanout_queue` holds `job_post_id` (PK, FK cascade), `due_at`, `attempts` and `last_error`.

**What adds a mission to the queue** (an upsert with `due_at = now() + 2 min`, which also absorbs the skills request):
- `job_posts` AFTER INSERT;
- `job_posts` AFTER UPDATE when it becomes live again: `filled → open`, or `admin_hidden_at` cleared on an open mission;
- `job_post_skills` AFTER INSERT / DELETE, while `response_count = 0`.

**The run:** `pg_cron` runs `private.run_mission_fanout(20)` every minute.
- It takes queued missions with `skip locked`.
- It checks again that the mission is live.
- It inserts into `mission_alerts` with `on conflict (job_post_id, freelancer_id) do nothing`.
- It writes bell rows for the **new** pairs only, then deletes the queue row.
- An error adds an attempt and retries later. The poster's transaction is never involved.

**Idempotent:** `unique (job_post_id, freelancer_id)`.
- A mission closed and re-opened, hidden then shown again, or with its skills edited is queued again.
- Only freelancers never alerted for that mission get a row. Nobody hears about the same mission twice.

### 4.3 Caps per freelancer

- **Bell:** the first 10 `mission_match` rows since Tunis midnight are individual rows.
- After that, one `mission_match_overflow` row per day collects the count (`group_key = 'mission_overflow:<date>'`,
  `group_count`): « +N nouvelles missions pour vos compétences ».
- Every alert still goes into `mission_alerts`, which the digest reads (§6).
- `mission_alerts.notification_id` points to the alert's own bell row, and is null for an overflow alert. Overflow
  alerts always reach the digest (G2).

### 4.4 Cost

| Volume | Freelancers | Missions | Alert rows |
|---|---|---|---|
| Today | 10 | about 1.5 a month | — |
| 10× | 100 | about 15 a month | at most 750 a month |
| 100× | 1,000 | about 150 a month (about 5 a day) | at most 7,500 a month, plus as many bell rows |

- **A run:** at most one scan of the eligible freelancers, with indexed lookups on `skill_key`, services by category and
  the active-proposal count. That is milliseconds even at 100×.
- **An empty minute:** one indexed SELECT.
- **Abuse:**
  - One poster can publish at most 10 missions per 24 h (`enforce_job_post_cap`).
  - Each mission alerts at most 50 freelancers in total (§4.1), however often it is re-opened or edited.
  - So one account triggers at most 500 alerts a day.
  - A recipient gets at most 10 rows plus 1 overflow row a day.
- **The real cost is e-mail.** Digests number at most `min(freelancers, 50 × missions a day)`: at 100×, about 250 a
  day.
- **At 100× in total**, about 50 order e-mails a day plus the digests reach the free Brevo cap (Q1).

## 5. Proposals, moderation, reports, stock, security

### 5.1 Proposals

**Where they are caught:**
- **New proposals:** an AFTER INSERT trigger on `job_responses`. The actor is the freelancer, the recipient the poster.
- **Decisions:** an AFTER UPDATE OF status trigger on `job_responses`. It sees both `choose_job_response` and
  `sync_job_responses_on_post_status`. It reads the mission to tell « non retenu » (another proposal was chosen) from
  « mission fermée » (no proposal chosen).

**Where `mission_full` is caught:** on `job_posts` itself (§2), when `response_count` goes from below 10 to 10. That is
the row `sync_job_post_response_count` writes, so its value is already final, whatever the trigger names.

**The first proposal (G1):** the proposal trigger inserts `first_proposal:<job_post_id>` with
`on conflict do nothing returning`.
- **A row comes back:** this proposal is the first, so it gets the instant e-mail.
- **Nothing comes back:** the proposal becomes a `digest_items` row.

**Dedupe keys.** `response_count` goes down on a withdrawal, so « count = 1 » alone could fire twice.

| What | Kept unique by |
|---|---|
| First-proposal e-mail | `first_proposal:<job_post_id>` |
| `mission_full` | one row per mission |
| « Retenu » e-mail | `chosen:<job_response_id>` |
| `proposal_chosen`, `proposal_not_chosen`, `mission_closed` | `unique (job_response_id, kind)`, so each is sent at most once per proposal (Q14) |

**Grouping:** proposals on the same mission within an hour become one row with a count, under a transaction advisory lock
on `(recipient, group_key)`.
- The trigger updates the newest unread row with that key if its first event is less than an hour old; otherwise it
  inserts a new row.
- A row already read is never reopened.

**On the deletion path**, the deleted account's missions move to `deleted`. Their pending proposals become `not_chosen`,
and those freelancers get « mission fermée » with the admin as actor. That is correct: they are other people.

### 5.2 Moderation and reports

- **Moderation is emitted inside `admin_hide_content` and `admin_suspend_user`, not from triggers on `admin_hidden_at` /
  `suspended_at`.**
  - `admin_process_deletion_request` writes those same columns (hide + suspend).
  - A column trigger would write fresh rows for the account being deleted.
  - An admin moderating their own content gets nothing (never-self).
  - The new code in those functions sits in its own exception block (§2). Their audit-log call deliberately rolls back
    the hide on failure; the notification must not.
- **A decided report:** a trigger on `reports` status. The deletion path keeps the reports a person sent (D6) without
  touching their status. A report decided later for a tombstone reporter gets no row (`is_tombstone`).

### 5.3 Stock

**Not built:** Q2 decided (a), no stock alerts for now.
- The kinds `stock_low` / `stock_out` and the `email_low_stock` toggle (default off) stay reserved.
- They come back when the founder sets when an order lowers the stock (`notifications-v2-followups.md` §8).

### 5.4 Security e-mails

**Supabase Auth sends these itself:** its security notifications `password_changed` and `email_changed` (« Security
notification email templates », [Auth e-mail templates](https://supabase.com/docs/guides/auth/auth-email-templates)).
- They are switched on per project; there is no outbox row.
- They are on by nature: the user has no toggle.

**Founder action:** turn them on and paste the FR text.

**Limit:** Auth templates have one language, so these stay in FR unless the language is copied into the user metadata
(logged).

## 6. Daily digest at 09:00 (Tunis)

**Schedule:** a `pg_cron` job at `0 8 * * *`.
- `cron.timezone` is GMT on this project.
- Tunisia has had no daylight saving time since 2009, so this is 09:00 Tunis all year.

**What `private.compose_digests()` does for each recipient:**
- It gathers three kinds of item:
  - mission alerts (`mission_alerts.digested_at` null), according to the frequency: daily, or weekly on Q7's day;
  - further proposals: one `private.digest_items` row per proposal, written by the proposal trigger for every proposal
    after the first. Marking is per proposal, never on the grouped bell row, whose count keeps growing after a digest;
  - no stock items: Q2 (a) rules them out for now.
- It drops items whose subject is no longer live: the mission closed, full, hidden or older than 30 days, or the proposal
  withdrawn.
- It drops items whose own bell row was read (Q6). Overflow missions, which have no bell row of their own, always stay
  (G2).
- **One item or more:** one `digest` row goes into the outbox, at most 20 items per section plus « et N autres ».
  - The items are marked digested **in the same transaction**.
  - They are marked **only if that insert really created the row** (`on conflict do nothing returning id`).
- **No item: no row, so no e-mail.**

**Idempotent:** `dedupe_key = 'digest:<recipient>:<Tunis date>'`, and items marked once.
- A second run the same day cannot insert a second row, so it marks nothing.
- Items that arrived after 09:00 wait for the next day.
- **Weekly:** items wait unmarked until the weekly run.
- **Off:** items are marked without an e-mail, so turning it back on does not send a backlog.

**Sending:** through the same sender, after the instant mail and within the daily budget (Q1).

## 7. Schema summary (the DB PRs write the PENDING files)

### 7.1 `notifications`: extended, with v1 rows still valid

**Columns:**
- **Made nullable:**
  - `actor_id` (system events). `notifications_never_self` stays: a NULL actor passes it.
  - `order_id`, `to_status`.
- **New links:**
  - FKs, nullable, with cascade: `job_post_id`, `job_response_id`, `report_id`.
  - Moderation uses `subject_type` + `subject_id` with no FK, because a moderated row cannot be deleted
    (`enforce_moderated_row_no_delete`).
- **New content:** `title_snapshot` (Q12).
- **Grouping:** `group_key`, `group_count int default 1 check (>= 1)`, `last_event_at default now()`.
- The digest's state is NOT kept here: it is in `private.digest_items` and `private.mission_alerts`.

**CHECKs:**
- `notifications_kind_check` and `notifications_kind_shape` become one shape CHECK per kind.
- The two v1 shapes stay exactly as they are: `order_id`, `to_status` and `actor_id` required.

**Kinds:**
- v1: `order_created`, `order_status_changed`.
- Proposals and missions: `proposal_received`, `mission_full`, `proposal_chosen`, `proposal_not_chosen`,
  `mission_closed`, `mission_match`, `mission_match_overflow`.
- Moderation and reports: `content_hidden`, `account_suspended`, `report_decided`.
- Stock: not added. `stock_low` / `stock_out` are reserved until the stock rule exists (Q2 a).

**Indexes:**
- `(recipient_id, last_event_at desc)` for the list, which now sorts on `last_event_at`;
- `(recipient_id, group_key)` for grouping;
- the new FKs.

**RLS and grants:**
- The policy is unchanged: the recipient reads their own rows.
- `authenticated` holds a **table-level** SELECT (`relacl`: `authenticated=r`), so the new columns are readable on the
  recipient's own rows with no new grant. None of them is sensitive to the recipient.
- `information_schema.column_privileges` lists the 9 v1 columns, but only because it expands the table grant.
- Clients still get no INSERT / UPDATE / DELETE.
- **Must-test:** each v2 kind is read by its recipient through PostgREST, with every new column, and by nobody else.

**The badge** must count only rows the list can show.
- UI-2's fix (D8 of #401) already leaves unknown kinds out.
- Title snapshots keep v2 rows showable after their subject becomes unreadable.

### 7.2 `notification_preferences`

**New columns:**
- `email_order_updates boolean not null default true` (« Suivi de mes commandes », D6);
- `email_missions_frequency text not null default 'daily'`, CHECK `daily|weekly|off`.

**The old boolean:** while the UI still writes `email_missions_matching`, a false value counts as `off`. A later cleanup
drops it (logged).

**Grants:** column INSERT / UPDATE for both new columns, plus the allow-list entry, in the same PR. The table has 0 rows,
so nothing needs backfilling.

### 7.3 New tables

All live in `private`, out of PostgREST, like `private.account_password_set`:
- `private.email_outbox`
- `private.mission_alerts`
- `private.mission_fanout_queue`
- `private.digest_items`: one row per digest-bound event other than a mission alert.
  - Columns: `recipient_id`, `kind` (`proposal` only, while Q2 rules stock out), `job_response_id` (FK, cascade),
    `notification_id` (the grouped bell row it was counted in, for Q6), `created_at`, `digested_at`.
  - It is written by the emitting trigger, inside the same exception block.

**Access:**
- Each has RLS on in the creating migration, and no client grant.
- Only SECURITY DEFINER functions write them.

**`mission_alerts`:**
- Columns: `job_post_id`, `freelancer_id` (FKs, cascade), `notification_id` (FK, `on delete set null`; null for an
  overflow alert), `shared_skills`, `category_match`, `rank`, `created_at` and `digested_at`.
- Constraints: `unique (job_post_id, freelancer_id)`.
- Index: a partial index on `freelancer_id` where `digested_at` is null.

### 7.4 Functions, extension, jobs, secrets

**Functions:**
- Private helpers: `job_post_is_live`, `active_proposal_count`, `is_tombstone`, `enqueue_email`, `run_mission_fanout`,
  `compose_digests`, `cleanup_notifications`.
- `claim_email_batch` / `settle_email`: EXECUTE for `service_role` only.
- `suggest_skills(p_category, p_prefix)`: EXECUTE for authenticated, for the autocomplete.
  - It returns the platform's most used spellings in that category.
  - A spelling appears only once at least 2 different accounts use it (Q16, decided).
  - Hidden, suspended and tombstone accounts never count.
  - So a suggestion never reveals one person's own wording. With today's 3 skill rows on 1 profile, it returns nothing.
- All use `search_path ''`.

**Extension:** `create extension pg_net` (schema `extensions`).
- Under the PUBLIC EXECUTE revoke on objects postgres creates, no client can call it.
- That is intended.

**Cron jobs:**

| Job | Schedule |
|---|---|
| `send-emails-kick` | every minute |
| `mission-fanout` | every minute |
| `daily-digest` | `0 8 * * *` |
| `notifications-cleanup` | daily (Q11) |

**Vault secrets** (the function URL and the shared secret) are inserted by the architect or the founder, never by a
migration.

### 7.5 Account deletion

`admin_process_deletion_request` gains, **at the end** (after the hide, close and suspend steps), deletes of the target's
rows in five places:
- `email_outbox`, all statuses;
- `mission_alerts`, as the freelancer;
- `digest_items`;
- `notifications`, as recipient, again;
- the queue rows of their missions.

**Must-test:** after an approval, 0 rows for the target in every one of these, and `claim_email_batch` never returns a
tombstone.

## 8. PRs, in order (each ≤ 3 commits)

**Ordering rules:**
- **After the bell panel:** Agent A's PRs touching `src/lib/notifications/*` or the dictionaries start after the
  bell-panel UI-2 merges.
- **UI kinds before DB writers:** a DB PR that starts writing a new kind is applied only after (or the same day as) the UI
  PR that maps it.
  - Before that, its rows are invisible: unknown kinds are dropped from the list, and from the badge after UI-2.
  - They would then all appear at once with old dates.

**Before launch (D7):**

1. **E-DB (Agent B):** the outbox, the order e-mail enqueue and the claim / settle RPCs.
   - **Scope:**
     - the outbox;
     - the order e-mail enqueue in `notify_order_counterparty` (its own block);
     - `email_order_updates`;
     - claim / settle;
     - `pg_net`;
     - the kick job, which does nothing while the Vault secret is absent;
     - the cleanup job;
     - the deletion update.
   - **Must-tests (live):**
     - every v1 order transition queues exactly 1 row for the other party with the toggle on, and 0 with it off (both
       toggles, both sides);
     - 0 rows for the actor;
     - a forced outbox failure keeps the order and the bell row;
     - two concurrent claims never return the same row;
     - a stale `sending` row is taken back;
     - the settle state machine: 2xx, 400, 429 / 5xx, 5 attempts;
     - the claim skips a toggle turned off, a tombstone and a suspended account (Q5);
     - anon and authenticated cannot reach the outbox or the RPCs;
     - after a deletion, 0 outbox rows for the person;
     - `client-write-grants-live` stays green.
2. **E-TPL (Agent A):** the order templates in FR / EN / AR (§3.4), and the « Suivi de mes commandes » row in Paramètres
   for every role (every role buys).
   - **Tests:**
     - the status labels equal the app dictionary's (the vocabulary lock);
     - href parity with `bellHref()`;
     - Arabic is `dir="rtl"`;
     - no template output contains an address or a phone (Q9).
3. **E-SEND (Agent B):** the `send-emails` Edge Function.
   - **Scope:**
     - claim → render → Brevo → settle;
     - the daily budget and the priority;
     - Sentry counts;
     - the excludes from §3.4;
     - our own `List-Unsubscribe` on digests;
     - **Brevo's own `List-Unsubscribe` (§3.4):**
       - find out what a click on it does to transactional mail;
       - make sure a digest unsubscribe cannot block instant, order or Auth mail, or else document how to unblock an
         address;
     - a runbook for the secrets: `BREVO_API_KEY`, `SITE_URL` (`https://servyou.tn`) and the shared secret, set by the
       founder;
     - a « Brevo blocked contacts » check in the runbook.
     - The architect deploys it.
   - **Tests:**
     - unit tests of the retry classifier and the budget;
     - a mocked Brevo run: the key equals the outbox id, and neither the key nor an address appears in a log;
     - a digest carries our `List-Unsubscribe`, and an order e-mail does not;
     - after the deploy, one live send to a team address;
     - one recorded check of what Brevo's unsubscribe link does, written into the runbook.
   - **This closes launch blocker 1.**
4. **V2-DB-1 (Agent B):** the new notification shape, proposals, `mission_full`, the frequency column, `skill_key` and
   `suggest_skills`.
   - **Must-tests:**
     - **v1 safety:** the v1 suite stays green; each kind's shape CHECK is enforced.
     - **Grouping:** 3 proposals within an hour give 1 row with count 3; a read row starts a new one.
     - **Dedupe:** the first-proposal e-mail goes out once per mission, even after a withdrawal and a new proposal.
       That later proposal becomes a digest item (G1). `mission_full` fires once.
     - **Decisions:** `chosen` gives a row and an e-mail row; the others get `proposal_not_chosen`. A close or a delete
       gives `mission_closed`.
     - **Close twice:** close → re-open → close gives each freelancer one `mission_closed`, not two (Q14).
     - **`mission_full`:** exactly at the 10th proposal, with the real count, whatever the trigger order.
     - **Actors:** the actor gets 0 rows, and a service-role write gives 0 rows.
     - **Failure isolation:** a forced failure of the notification write (for example a broken CHECK in a rolled-back
       transaction) still lets the proposal insert and `choose_job_response` succeed.
     - **Preferences:** `email_proposals` off means no first-proposal e-mail, no « Retenu » e-mail and no digest item.
       Each is checked at enqueue and again at claim.
     - **Concurrency:** two proposals arriving at once on the same mission still give one grouped row with count 2.
     - **RLS and columns:** each new kind is read by its recipient through PostgREST, with every new column, and by
       nobody else. `private.digest_items` cannot be reached by anon or authenticated.
     - **Keys:** SQL `skill_key` and `skillKey()` agree on the fixture list.
     - **Deletion:** 0 rows for the target. A deleted poster's missions give the other responders `mission_closed` and
       give the tombstone nothing.
5. **V2-UI-1 (Agent A):**
   - the bell sentences, icons and tones for the proposal and mission kinds in `bell-kinds.ts`;
   - the « Retenu », first-proposal and digest templates;
   - the daily / weekly / off control in Paramètres;
   - skill autocomplete in the profile and mission forms, from `suggest_skills`.
6. **V2-DB-2 (Agent B):** mission alerts and the digest.
   - **Scope:** `mission_alerts`, the queue and its triggers, the fan-out job, the overflow row, and the digest job at
     `0 8 * * *`.
   - **Must-tests:**
     - **Matching:** skill only, category only, both, neither, and accents and case.
     - **Q3 (b):** a freelancer with no active service (unpublished) who can answer **is** alerted, by skill.
     - **G2:** overflow missions reach the digest even after the overflow row is read.
     - **Skips:** each one is tested:
       - the poster;
       - a suspended account;
       - a hidden profile;
       - under 18;
       - no freelancer profile;
       - 5 active proposals;
       - a tombstone;
       - a full mission;
       - a closed, hidden or expired mission;
       - a mission with no category and no skills.
     - **Ranking and caps:**
       - the ranking order;
       - the cut at 50 **per mission in total**, across a re-open and a skill edit;
       - 10 a day, then 1 overflow row with the right count;
       - the day rolls over at Tunis midnight (23:00 UTC), not UTC midnight.
     - **Idempotency:** a re-run, a re-open, an unhide or a skill edit gives no second alert for the same pair, only new
       pairs.
     - **Concurrency:** two fan-out runs at the same time never alert the same pair twice, and never exceed 50.
     - **The skills race:** skills inserted one request later are still matched.
     - **Preferences:** frequency daily, weekly and off, and `email_missions_matching = false` counting as off.
     - **RLS:** `mission_alerts` and the queue cannot be reached by anon or authenticated.
     - **Digest:**
       - nothing new means no outbox row;
       - items are marked once;
       - weekly items wait;
       - « off » marks without sending;
       - a second run the same day does nothing.
     - **Deletion:** 0 rows for the target, including `mission_alerts` where they were the freelancer.

**Just after launch (D7):**

7. **V2-DB-3 (Agent B):** moderation and decided reports. No stock (Q2 a).
   - **Must-tests:**
     - each target type gives the owner 1 row and 1 e-mail row that ignores preferences;
     - a forced failure of the notification write still lets the hide or the suspension commit, with its audit log;
     - the deletion path writes nothing for the deleted account;
     - a decided report gives the reporter 1 row;
     - an admin moderating their own content gets nothing.
8. **V2-UI-2 (Agent A):** the bell kinds and templates for moderation and reports.

**Founder actions:**
- Move Brevo to a paid plan (Starter, no daily cap) before launch (Q1). Until then, the sender's daily budget protects
  the Auth e-mails.
- Turn on Supabase Auth's security notifications, with the FR text.
- Set the function secrets.
- Answer the stock product question (`notifications-v2-followups.md` §8). It is outside this plan.

## 9. Risks

1. **Brevo quota:**
   - Free is 300 a day, and it is **already** shared with the Auth e-mails: Brevo carries the Supabase Auth SMTP today.
   - Without the budget, a busy digest morning would block sign-up and sign-in links. The budget ships from the start,
     and the paid plan comes before launch (Q1).
2. **Duplicates:** delivery is at least once; see §3.2 for the case that duplicates.
3. **Skills are free text:**
   - Only 1 profile has skills today, so the category rule does almost all the matching.
   - The autocomplete is the fix. With Q3 (b), a freelancer without a service is matched by skill alone.
4. **The Edge Function is deployed outside CI:**
   - The deployed version can drift from the repo. E-SEND's runbook includes a check.
5. **Supabase Free plan:** 500,000 invocations, 150 s and 2 s of CPU per call. Batches of 50, with a timeout on each
   Brevo call, keep a run well inside those limits.
6. **Brevo's own unsubscribe link (to confirm):**
   - Brevo adds its own `List-Unsubscribe` to relayed mail.
   - If a click puts the address on Brevo's transactional blocklist, a digest « unsubscribe » would also stop order
     e-mails and sign-in links.
   - E-SEND checks this, keeps such a click from blocking that mail or documents the unblocking, and adds a « blocked
     contacts » check to the runbook (§3.4).
7. **Bulk-sender rules:** digests carry a one-click unsubscribe link (to Paramètres) from the start, even below the
   thresholds.
8. **E-mails leave RLS:**
   - Content stays at title, status and link (Q9).
   - Mission titles are snapshots the recipient could already read (Q12).
9. **Invisible rows:** see the ordering rules in §8.
10. **Expired missions:** expiry writes no status, so pending proposals on an expired mission get no « mission fermée »
    (Q8).

## 10. Out of scope

- Browser and phone push.
- Favourites and profile views.
- Messages (WhatsApp in the MVP).
- Reviews (Phase 3).
- The Fiverr-style head start for the best matches.
- SMS / WhatsApp notifications.
- Realtime for the bell (v1 D3).
- The newsletter: `email_newsletter` exists, nothing sends it.
