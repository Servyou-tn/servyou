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
