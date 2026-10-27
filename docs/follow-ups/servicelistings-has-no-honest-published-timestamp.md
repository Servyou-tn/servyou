# `service_listings` has no honest "published" timestamp (found 2026-09-04, `fix/h4-dashboard-fidelity`)

- **What:** H4's Activité récente panel has a measured Figma kind, "Service «title» publié"
  (167:12333), that needs to know when a listing went live. `service_listings` only has
  `created_at` and `updated_at` — checked `information_schema.columns` directly. `created_at`
  fires at row creation regardless of status, so it conflates a listing created as a draft with
  one that's actually publicly visible; `updated_at` fires on any edit (price, description,
  delivery time — not specifically a status transition), so it's not a publish signal either.
  Checked for a status-history table too (`information_schema.tables` filtered on
  service/listing/audit-shaped names) — nothing exists but `admin_audit_log`, which is unrelated
  (admin actions, not listing lifecycle).
- **Not fixed here:** the founder ruled this kind waits rather than shipping on a timestamp that
  can lie in a notification feed ("Service published" showing for a listing that's still a
  draft). Not built in this PR — Activité récente ships with its other three measured kinds only.
- **Trigger:** a migration adding `service_listings.activated_at`, set from the same trigger that
  already maintains `freelancer_profiles.is_published` — that trigger already fires on the right
  transition (draft/inactive → active), so deriving `activated_at` from it is a small addition,
  not new lifecycle logic. Needed by this Activité récente event kind, and worth having generally
  for any future notification/email that wants to say "your listing is live" honestly.
