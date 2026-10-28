# Security follow-ups batch (`fix/security-followups-batch`, 2026-10-28)

Live re-verification (read-only, 2026-10-28) of every open DB-side finding in `security-audit-open-findings.md`,
`jobresponses-integrity.md`, `pre-public-security-audit-follow-ups.md`, `suspension-enforcement.md`,
`live-suite-teardown-guard.md` and `missions-m-c-…md`. Seven fixes are written as `db/migrations/PENDING_*.sql`, and
the red proof is `src/__tests__/security-followups-batch.test.ts` (14 red / 5 controls green before apply).

## Must change when the PENDING files are applied

- `PENDING_orders_admin_insert_tier2`: `job-posts-write-guards.test.ts` (admin INSERTs with cancel columns / at
  `cancelled`, lines ~476–512) and `orders-lifecycle-columns.test.ts` (« an admin JWT … inserting at received »)
  assert today's admin bypass and turn red. Rewrite them to expect `Une commande est toujours créée en attente.`
- `PENDING_orders_received_at_revoke`: `orders-lifecycle-columns.test.ts` « a seller cannot plant received_at »
  expects a silent pass and turns into 42501 `permission denied for table orders`.
- The column-grant files make new columns on `freelancer_profiles` (INSERT / UPDATE) and `shops` (INSERT) not
  client-writable until a migration grants them. Record this in the db-guardian skill next to P2-1.

## Open — founder decision needed (no SQL written)

- **MEDIUM — moderation is shed by DELETE + re-INSERT of the freelancer profile** (live: the DELETE policy is
  `profile_id = auth.uid()` only). Options: refuse the DELETE while `admin_hidden_at` is set, or move moderation to
  `profiles`.
- **MEDIUM — `get_contact_phone` ignores post state.** Responses to a moderated post (0 live) still unlock the
  phone. A `status` condition would cut the legitimate filled-post contact, so the only candidate condition is
  `jp.admin_hidden_at is null`. A related product call: should suspension or moderation of the responder revoke the
  phone unlocks they already hold?
- **MEDIUM — suspended counterparty:** orders and responses can still target a suspended account, and that
  account's content stays public.
- **LOW — orders D2 / D4:** a client can set `created_at` / `updated_at` on INSERT (table-level INSERT grant), and
  the stock rule is enforced in the app only. If approved, D4 goes in the same function as the admin tier-2 fix
  (one DO block per function).
- **LOW — `shops.owner_id` not unique** (max 1 shop per owner live): add a unique index, or decide that multi-shop
  is a future feature.
- **LOW — `admin_hidden_reason` is readable by the owner and anon** (SELECT column grant). Revoking it needs a
  definer read for the admin pages.
- **LOW — `public_profiles` exposes the name and city of a moderated seller.**
- **Design — the "switch seller type" flow** (cannot be a user-session delete-then-switch).
