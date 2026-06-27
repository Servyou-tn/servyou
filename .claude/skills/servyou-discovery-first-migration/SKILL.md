---
name: servyou-discovery-first-migration
description: |
  Use this skill ANY time CC is about to modify the Supabase database schema, write a migration, alter a table, add a column, drop a column, create an index, create a trigger, modify an RLS policy, create a view, create or modify a function, drop a constraint, or run any DDL statement. MUST trigger when the user mentions: "migration", "migrate", "schema", "ALTER TABLE", "CREATE TABLE", "ADD COLUMN", "DROP COLUMN", "CREATE INDEX", "DROP INDEX", "CREATE TRIGGER", "DROP TRIGGER", "RLS", "policy", "row level security", "GRANT", "REVOKE", "CREATE FUNCTION", "CREATE VIEW", "CASCADE", "constraint", "foreign key", "primary key", "Supabase", "Postgres", "database change", "schema change", "search_vector", "tsvector", "GENERATED", "generated stored", "SQL". ALSO trigger when CC is about to use the Supabase MCP `apply_migration` or `execute_sql` tools for any DDL operation. The job is to PREVENT silent breakage from undocumented schema state. Born from PR-F2.3 where CC nearly recreated a search_vector trigger that did NOT exist (the column was GENERATED STORED, not trigger-driven). Discovery first, then propose plan, then STOP and wait for founder approval, then apply. NO exceptions, NO "quick fix" migrations, NO assumed schema state.
---

# Servyou Discovery-First Migration

The Servyou database has organic complexity from 7 build phases. Schema state in your head is NOT the same as schema state in production. PR-F2.3 search_vector trap is the canonical lesson: the brief assumed a trigger; reality was a GENERATED STORED column. CC nearly recreated the trigger, which would have silently corrupted full-text search.

**The rule:** Read first. Report findings. STOP. Wait. Apply.

## The 4-phase discovery flow

### Phase 1 — DISCOVER

Before writing any migration SQL, run reads via `execute_sql` to understand current state:

```sql
-- For a table you're about to modify:
SELECT column_name, data_type, is_nullable, column_default,
       is_generated, generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'YOUR_TABLE'
ORDER BY ordinal_position;

-- Triggers on the table:
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'YOUR_TABLE';

-- Constraints:
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND table_name = 'YOUR_TABLE';

-- Indexes:
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'YOUR_TABLE';

-- RLS policies:
SELECT polname, cmd, qual, with_check
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'YOUR_TABLE';

-- Foreign keys pointing TO this table:
SELECT tc.table_name, kcu.column_name
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
WHERE rc.unique_constraint_name IN (
  SELECT constraint_name FROM information_schema.table_constraints
  WHERE table_name = 'YOUR_TABLE' AND constraint_type = 'PRIMARY KEY'
);
```

For tables being created from scratch, discovery is less needed — but STILL check:
- Does a similar table already exist? (Avoid duplicate concepts)
- Do referenced foreign-key target tables exist with the expected columns?
- Are there existing RLS policy patterns to mirror?

### Phase 2 — REPORT

After running discovery reads, generate a structured report:

```markdown
## Discovery Report — Migration MIG-XYZ

**Target:** [table name + intended change]

**Current state findings:**
1. [Column X is GENERATED STORED, expression: ...]
2. [Trigger Y fires on UPDATE, modifies column Z]
3. [Existing index on (col1, col2) — recreating risks duplicate]
4. [RLS policy "users_can_read_own" uses auth.uid() — must preserve]
5. [Foreign key from `orders.service_id` will CASCADE if we drop]

**Conflicts with the proposed change:**
- [E.g., "Brief says CREATE TRIGGER for search_vector, but column already exists as GENERATED — recreating would conflict."]

**Risks identified:**
- [E.g., "Dropping column X would break the orders.service_id FK"]
- [E.g., "Migration on RLS policy must not leave window where access is open"]

**Proposed plan:**
- [Step 1: ...]
- [Step 2: ...]
- [Skip step from brief because reality differs: ...]

**Awaiting founder approval before proceeding.**
```

### Phase 3 — STOP

After reporting findings, **STOP**. Do NOT proceed to `apply_migration`. Do NOT run the DDL. Wait for the founder to respond with:
- ✅ "Approved — proceed with the revised plan"
- ⚠️ "Adjust X then proceed"
- ❌ "Hold — let me think / discuss with the team"

**If 5+ minutes pass without response:** Do NOT proceed unilaterally. The migration can wait. Founder approval is required even on "obviously correct" migrations because the cost of silent corruption far exceeds the cost of waiting 30 minutes.

### Phase 4 — APPLY

Only after explicit founder approval:

1. Write the final migration SQL incorporating discovery findings
2. Use `apply_migration` (not `execute_sql`) so it lands in `supabase/migrations/` with a timestamp
3. Mirror the file to `/db/migrations/` in the repo per engineering-standards
4. Verify post-apply with the same discovery queries — confirm state matches intention
5. Report success with the verification output

## What to refuse

❌ **Migrations without discovery first** — even "trivial" ones
❌ **Combining discovery + apply in one tool call** — must be separate, must wait for approval between
❌ **"Quick fix" migrations** — there's no such thing as quick; corrupted data is permanent
❌ **Assuming schema state from data-model.md alone** — the doc may be stale; check production
❌ **Recreating an object that may exist** — `CREATE TABLE IF NOT EXISTS` hides drift, doesn't fix it
❌ **Risky migration bundled with low-risk migration** — split into two PRs per Standard B
❌ **Changing RLS policy without testing affected queries** — every policy change needs explicit RLS smoke check
❌ **Dropping columns/tables without confirming no FK references** — CASCADE is a footgun

## Two-PR pattern for risky migrations

Per Standard B (standards-reference Section 9), when a migration has TWO parts and one is materially riskier:

**Don't:** Bundle a column-add with a search_vector recreation in one PR.

**Do:** Split:
- PR-X.1: Add the safe column (low risk)
- PR-X.2: Touch the search_vector (high risk, isolated)

Track the deferred PR in `docs/design-phase/pending-migrations.md`. This was the actual approach taken on PR-F2.3 — the search_vector recreate was deferred to a future PR-F2.X.search and the low-risk column adds shipped first.

## Worked example — the search_vector trap

**Brief said:** "Add `search_vector` trigger on service_listings table for full-text search."

**Discovery found:**
```
search_vector | tsvector | NO | generated stored
generation_expression: to_tsvector('french', (title || ' ' || description))
```

**Report to founder:**
> The `search_vector` column already exists as GENERATED STORED, not trigger-driven. Brief is incorrect.
>
> Recreating it as a trigger would:
> 1. Drop the existing column (data loss)
> 2. Or fail because column already exists
> 3. Or create a parallel mechanism causing drift
>
> Proposed: do NOT touch search_vector. The full-text search works correctly today. Skip this part of the brief.

**Founder approved skipping.** Migration shipped without touching search_vector. PR-F2.3 closed cleanly.

**The lesson:** If CC had not discovered first, it would have run `CREATE TRIGGER` and silently broken full-text search across the platform. Discovery prevented production breakage.

## Coordination with other skills

This skill works independently of UI skills. It's the database-side discipline. If a PR involves BOTH a schema change AND UI work, this skill runs FIRST (gate the migration), then `servyou-design-system-compliance` and others apply to the UI side.

## Reference

- Standard A: discovery-first migrations — `servyou-standards-reference.md` Section 9
- Standard B: defer-don't-rush risky migrations — same doc, same section
- Origin case study: PR-F2.3 search_vector trap
- Engineering patterns: `engineering-standards.md`
- Data model reference: `data-model.md`
