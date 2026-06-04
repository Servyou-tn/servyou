# Servyou — Project Rules for Claude Code

## Source of truth
The seven layer documents (Vision, Users & Roles, Features & Journeys, Data Model, Security, Technical Architecture, Build Plan) in the project knowledge are the definitive specification for Servyou. Always follow them. Discard any older instructions that contradict them.

## What is IN the MVP (per Build Plan phases 1-10)
- Phase 1: Identity (signup, login, logout, password reset, profile editing) — DONE
- Phase 2: Categories + full DB skeleton with RLS — DONE
- Phase 3: Shop owners (upgrade, shop, products, public shop page) AND freelancers (upgrade, profile, skills, services, public freelancer page) — DONE
- Phase 5: Consumer discovery and requests with COD + WhatsApp — DONE
- Phase 6: Favorites (heart icon, /mes-favoris) — IN THE MVP
- Phase 7: Job-posting system (consumer posts, freelancer responses, ~10 responses/post cap, ~5 active responses/freelancer cap, proposal messages)
- Phase 8: French + Arabic with RTL (French built first, Arabic translated from finished French)
- Phase 9: Admin dashboard + reports as real case-handling with loop-closing + aggregate anonymous stats
- Phase 10: Polish and launch

## What is DEFERRED to version two (not the MVP)
In-platform card payments, subscriptions, escrow, reviews/ratings, full notification system, AI agents/subagents, freelancer-to-freelancer collaboration, full liberal-professional templates, small-company templates, deep COD-failure solutions, saved delivery addresses on profiles, complex profile customization, LinkedIn-style connections/endorsements, social feeds.

## Working rules
- Build basic-first in every phase: minimal working version before enriching it
- Function-first: features must work correctly; full UI/UX polish is a separate dedicated phase later
- One feature per branch, PR workflow: feature/<name> branch → push → Vercel green → merge → delete branch → sync main
- One real test for anything with real logic (auth, data writes, role/state changes); pure display pages can rely on the green build check
- Verify-don't-assume: confirm features actually work, with a database check or a real user action, before merging
- French is the default UI language; Arabic comes in Phase 8

## Commit style
- NEVER include "Co-Authored-By" or any Claude/Anthropic attribution in commits
- Clear, descriptive commit messages
- Do NOT commit .env.local or .claude/

## Code & data rules
- NEVER use the Supabase service role key in client code; only the publishable (anon) key in browser code
- All tables have RLS; never bypass it in app code
- A database trigger handles new-user profile creation; signup pages do NOT insert into profiles directly
- Money is stored as numeric(10,2) in TND
- Stock model: tracks_stock + stock_count (dropshipping-friendly: tracks_stock=false means "Toujours disponible")
- seller_type: null = consumer (universal buying baseline); 'shop_owner' or 'freelancer' for sellers; never both; switching deletes own role content but preserves completed transaction records
- Image storage uses Supabase Storage public buckets for display images only

## Engineering Discipline (earned during the build — do not violate)

### Before building anything
- Read the relevant layer docs (Layers 1–7) for the feature first. Verify existing
  tables, columns, and RLS against Layer 4 and Layer 5. Report any drift.
- This is a features-on-existing-schema project, NOT a fresh build. Do NOT recreate
  or rebuild tables that already exist. Verify, don't rebuild.
- Stay in scope. Build only what the current task names. Flag anything that looks
  like scope creep and wait for confirmation.

### Supabase queries
- NEVER destructure only `data` from a Supabase call. Always capture `error` and
  surface it (console.error at minimum; show a real error state, never a silent
  empty list). A swallowed error once hid a real bug for a day on /mes-missions.
- RLS gates ROWS, not columns. You cannot make some columns public and others
  owner-only with one table policy. Sensitive columns (phone, email, date_of_birth)
  stay owner-only.
- To read ANOTHER user's data: use the `public_profiles` view for name/city, and
  `get_contact_phone(target)` for phone. Never invent a nested PostgREST join
  through freelancer_profiles, and never read phone/email/dob directly across users.
- The protection of `public_profiles` lives entirely in its SELECT column list.
  NEVER add phone, email, or date_of_birth to that view.

### The database is the source of truth for rules
- Every business rule (fairness caps, age 18+ to sell, one seller capability) and
  every sensitive-data permission MUST be enforced in the database (constraint,
  trigger, or RLS) — not only in app code. App checks are for friendly messages;
  the DB is the real guard.

### Migrations
- Present EVERY migration for human approval before applying. Never auto-apply to
  the live database. Never "don't ask again."

### Shipping
- Run `npm run build` locally before pushing — not just `next dev`. `next dev` skips
  the strict TypeScript check that `next build` and Vercel run; a type error it
  ignored once failed the Vercel deploy.
- One branch per feature. PR against main. Wait for the Vercel GREEN check before
  merging — never merge on a red or pending check.
- One real test for anything with real logic. No Co-Authored-By in commits.
- Function-first: UI/UX polish is a dedicated later phase, not now.
