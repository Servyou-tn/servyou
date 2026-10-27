# G7's `536:32841` "produit en brouillon" specimen stays logged as blocked-on-schema — not deleted (fix/g7-header-and-dirty-state, 2026-08-18)
- **What:** still standing from `docs/design/g6-discovery.md` §8 (lines 585-623): G7 has a
  dedicated Figma specimen (`536:32841`, "G6 — produit en brouillon") for a `draft` product state,
  but the live `products.status` CHECK (`CHECK (status = ANY (ARRAY['active', 'hidden',
  'sold_out']))`) has no `'draft'` value. Of that doc's three options, only **option A** (add
  `'draft'` to the CHECK, then audit every `status='active'` read path) makes the frame buildable
  as designed; the schema shipped with **option B** (map "brouillon" → `hidden`), which the
  discovery doc already flagged makes `536:32841` "unbuildable as designed."
- **Ruling (founder, 2026-08-18):** keep the frame reference in the registry/discovery docs,
  flagged blocked-on-schema — do not delete it. It documents a real, still-open product decision
  (whether drafts get their own status), not a stale artifact.
- **Trigger:** the migration PR that adds `'draft'` to the CHECK (option A, `g6-discovery.md` §8),
  audited against every `status='active'` read path (`lib/marche/data.ts`,
  `lib/marche/filter-categories.ts`, search, D3, D1).
