# Notifications v2: items found during discovery (`docs/notifications-v2-plan`, 2026-11-19)

These came up during the read-only discovery for `docs/follow-ups/notifications-v2-plan.md`. They are not in that plan's
PRs, and none of them is fixed here.

## 1. Expired missions have no status write

- **What:** `job_posts.status` is never set to `expired`. Expiry is computed (`created_at` older than 30 days) in RLS
  and in `check_job_response_limits` / `choose_job_response`. As a result:
  - pending proposals on an expired mission stay `pending`, and no trigger fires;
  - a « mission expirée » notification is impossible today.
- **Why deferred:** the research does not ask for one (plan Q8). A status write needs a cron job and a change to
  `enforce_job_post_writes`.
- **Where it lives:** `enforce_job_post_writes`, the « Open posts or own posts readable » policy on `job_posts`.
- **Trigger:** the founder wants freelancers told when a mission expires, or the 30-day rule changes.

## 2. Security e-mails are French only

- **What:** Supabase Auth's security notifications (`password_changed`, `email_changed`) use one template per project.
  - `profiles.language` is not copied into the user metadata, so a template cannot branch on it.
  - English and Arabic readers therefore get the French text.
- **Why deferred:** the same holds for every Auth e-mail today (sign-up, sign-in, recovery).
- **Where it lives:** Supabase → Authentication → Email Templates; `profiles.language`.
- **Trigger:** the founder wants Auth e-mails in the reader's language. The likely fix copies `language` into
  `raw_user_meta_data` and branches the templates on `.Data`.

## 3. Arabic skill spellings do not fold

- **What:** neither `skillKey()` nor the planned SQL `skill_key` folds Arabic diacritics (harakat) or alef variants
  (أ إ آ ا). Two spellings of one Arabic skill never match, in the proposal form or in mission alerts.
- **Why deferred:** there are no Arabic skill rows today (3 freelancer skill rows in total). Choosing what to fold is a
  linguistic decision.
- **Where it lives:** `src/lib/marche/skills-match.ts`, and the `skill_key` columns of V2-DB-1.
- **Trigger:** the first Arabic skills appear, or skill autocomplete ships.

## 4. Drop `email_missions_matching` after the frequency control ships

- **What:** V2-DB-1 adds `email_missions_frequency`.
  - Until the Paramètres control stops writing the old boolean, a false value counts as `off`.
  - After that, the boolean, its column grants, its allow-list entry and its `NotifPrefsInput` key are dead.
- **Why deferred:** dropping it in the same release would break the live toggle for the length of a deploy.
- **Where it lives:** `notification_preferences`, `db/client-write-allowlist.json`, `src/lib/notifications/prefs.ts`.
- **Trigger:** V2-UI-1 merged and live.

## 5. The personal-data export does not include v2 rows

- **What:** `data_exports` does not include bell rows (logged by the v1 plan). V2 adds mission alerts and e-mail history
  for each person.
- **Why deferred:** the export is not touched by this plan.
- **Where it lives:** the data-export flow (`admin_process_data_export`).
- **Trigger:** the next change to the export.

## 6. The deployed Edge Function can drift from the repo

- **What:** CI deploys the app, but nothing deploys or checks `supabase/functions/send-emails`. A fix merged without a
  redeploy leaves production on the old code.
- **Why deferred:** the function does not exist yet (E-SEND creates it).
- **Where it lives:** E-SEND's runbook.
- **Trigger:** E-SEND. Add a check that compares the deployed version with the repo (Supabase MCP `get_edge_function`).

## 7. « Published » is not « can answer a mission »

✅ CLOSED for mission alerts — 2026-11-19, founder Q3 (b): alerts go to everyone who can answer, published or not. The
eligibility is shared through `private.can_answer_missions` (plan §4.1).

- **What:** `freelancer_profiles.is_published` means « has an active service ». `enforce_job_responder_capability`
  lets any freelancer aged 18+, not suspended and not hidden answer a mission, published or not.
  - Wherever the app equates the two, a freelancer without a service is treated inconsistently.
  - Mission alerts (plan Q3) are the first place where that matters.
- **Why deferred:** a product question, asked as plan Q3.
- **Where it lives:** `sync_freelancer_is_published`, `freelancer_has_active_listing`,
  `enforce_job_responder_capability`.
- **Trigger:** the founder's answer to Q3.

## 8. PRODUCT QUESTION for the founder: when should an order lower the stock?

- **What:** nothing lowers `products.stock_count`.
  - Only the owner's product form writes it (`src/app/actions/products.ts`).
  - Each order only checks quantity ≤ stock, in `enforce_order_insert_integrity` (Ruling 8) and in
    `src/app/demander/[id]/actions.ts`.
  - So a product with stock 1 can be ordered again and again: every order passes the same check against the same
    unchanged count.
  - The founder needs to decide:
    - when an order lowers the stock: on request (`pending`), on `accepted`, or on delivery (`arrived` / `received`);
    - when it gives the stock back: cancelled by either party, or refused at delivery;
    - whether a product at 0 switches to `sold_out` by itself.
- **Why deferred:** it is a product rule, outside the notifications plan. The plan only records its consequence: no
  stock alerts for now (plan Q2, decided (a)). The architect asked for it to be logged here, 2026-11-19.
- **Where it lives:** `enforce_order_insert_integrity`, `check_order_status_transition`, `products.stock_count` /
  `tracks_stock` / `status`, `src/app/demander/[id]/actions.ts`.
- **Trigger:** the founder's answer. The stock alerts (plan §5.3, D5 « 2 units or fewer ») can then be planned on top of
  it.
