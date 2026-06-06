# Database Migrations

This folder holds the canonical SQL for every database migration that has been applied to Servyou's production Supabase project (`xggomcitqrkaylqezjjz`).

## Why this folder exists

The production database is the live source of truth for the schema, but a database alone is not a complete engineering artifact. Future maintainers need to read the history of what changed, when, and why. This folder mirrors what Supabase stores internally in `supabase_migrations.schema_migrations`, so the repository is the readable, diff-able, code-reviewable record of every schema change.

This complements `docs/servyou-layer-4-data-model.md`, which describes the intended schema design (the WHAT and the WHY). This folder is the implementation (the HOW), in the exact order it landed.

## File naming convention

Each file follows the pattern:

```
<version>_<name>.sql
```

Where `<version>` is a 14-digit timestamp `YYYYMMDDHHMMSS` (UTC) and `<name>` is the snake_case migration name. This matches Supabase's internal migration naming and sorts chronologically when listed.

Examples:

- `20260603002549_create_profiles_table.sql`
- `20260606141915_orders_lifecycle_expansion.sql`
- `20260606155746_orders_role_gating_trigger.sql`

## Workflow going forward

When a new migration is applied via the Supabase MCP `apply_migration` tool:

1. Note the version (timestamp at the moment of apply) and the name passed to the tool.
2. Create a new file `<version>_<name>.sql` in this folder.
3. Paste the exact SQL that was applied (the `query` argument to `apply_migration`).
4. Commit the new file in the same PR as any application code that depends on the migration (or in its own focused PR if the migration ships standalone).

This is a manual mirror of what Supabase tracks internally. The benefit is that the repository becomes a single self-contained record of the schema's history — readable without database access, reviewable in PRs, and diff-able across branches.

## Historical context

These 15 migrations represent the entire schema history of Servyou from initial setup (June 3, 2026) onward. Migrations are listed in chronological order:

1. **20260603002549_create_profiles_table** — initial `profiles` table with role-based identity (later revised)
2. **20260603174720_revise_profiles_table_to_layer4** — replaced `role` column with `seller_type`, added `date_of_birth`, `phone`, `is_admin` per Layer 4 design
3. **20260603181526_auto_create_profile_on_signup** — `handle_new_user` trigger on `auth.users` insert
4. **20260603182553_categories_and_admin_helper** — `categories` table + `is_admin()` SECURITY DEFINER helper
5. **20260603182611_shops_products_images** — shop, product, and product images tables with RLS
6. **20260603182632_freelancers_skills_services_media** — freelancer profile, skills, service listings, service media tables with RLS
7. **20260603182645_orders** — orders table (unified product/service, COD delivery fields, initial 3-value status)
8. **20260603182702_job_posts_skills_responses** — job board tables with RLS
9. **20260603182716_favorites_and_reports** — favorites (private) and reports (reporter + admin) tables
10. **20260603231958_job_response_fairness_trigger** — `check_job_response_limits` BEFORE INSERT trigger (10 per post, 5 active per freelancer)
11. **20260604000331_profiles_privacy_fix** — replaced permissive read policy with owner-only read + `public_profiles` view + `get_contact_phone` RPC for relationship-scoped contact reveal
12. **20260604090224_add_null_caller_guard_to_get_contact_phone** — defense in depth: explicit NULL check on `auth.uid()` in `get_contact_phone`
13. **20260606141915_orders_lifecycle_expansion** — expanded orders.status from 3 values to 8 (per Layer 4 §4.6), added `cancelled_by`, `cancellation_reason`, `received_at` columns
14. **20260606155746_orders_role_gating_trigger** — `check_order_status_transition` BEFORE UPDATE trigger enforcing buyer/seller role gating, no-skips/no-backwards transitions, cancellation reason pivots
15. **20260606192321_shop_configurable_workspace** — adds the configurable workspace fields to the shops table (shop_type, delivery_setup, working_hours, location_detail) plus shop_payment_methods and shop_categories child tables with RLS policies (per Configurable Workspace Principle in product.md, schema details in data-model.md)

Migration 13 includes a one-row data UPDATE (legacy `'completed'` → `'received'`) because the constraint widening required the legacy row to be reconciled with the new allowed value set. Migration 14 closes the pre-existing wide-open RLS UPDATE policy by adding DB-level transition enforcement above the row-gating policy.

## Rollback paths

Each migration in this folder represents work that has already been applied to production. Rollback is therefore reverse migration work, not file deletion. If a rollback is ever needed, write a new dated migration that reverses the relevant changes — never delete history from this folder.

For reference, the inverse SQL for migrations 13 and 14 (the most recent two) is documented in the PR descriptions of the PRs that introduced them.

## Verification

To verify this folder is in sync with Supabase's internal migration history:

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version ASC;
```

The output should match the file list in this folder (excluding the README).
