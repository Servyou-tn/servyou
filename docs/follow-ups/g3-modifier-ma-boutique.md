# G3 — Modifier ma boutique (`feat/g3-shop-edit`, 2026-08-15)

## New follow-up class: replacing a shop logo/banner deletes the OLD object in-action — distinct from the CASCADE-orphan sweep

- **What:** `ma-boutique/modifier/actions.ts`'s `updateShopAsset` reads the shop's current
  `logo_url`/`banner_url` before uploading a replacement, uploads the new object to a fresh path,
  points the column at it, and only THEN deletes the old object via the Storage API
  (`.remove([oldPath])`) — never SQL. If that delete fails it is logged and the update still
  stands: a stranded object beats a lost image.
- **Why this is a NEW class, not a duplicate of "Orphaned storage objects need a reconciliation
  sweep" (line 119):** that entry is about a shop ROW disappearing (CASCADE to `products` →
  `product_images`) with no application code in the path at all — nothing to hook an in-action
  delete onto, hence "sweep, not prevent". This one is the opposite shape: a single, precisely
  known object being replaced by application code that IS in the path, so an in-action delete is
  both possible and sufficient. `shops.logo_url`/`banner_url` no longer need the periodic sweep to
  catch a replace — only a shop DELETION (still unbuilt) would still orphan one that way.
- **Also added, same file:** `removeShopBannerAction` — `BannerField`'s reused "Retirer l'image" X
  reads as "undo my unsaved pick" when a local file is staged, but as "delete my banner" when what
  is showing is the stored `banner_url`. The second case needed a real delete path (null the
  column, then remove the object) that create-mode never needed, since create-mode has nothing
  stored yet to delete. Mirrors `mon-compte/actions.ts`'s `removeAvatarAction`.
- **Trigger:** none — this is the closure, logged for future readers who go looking for how
  shop-asset replacement handles the old object.

## `/ma-boutique/creer/configuration`'s primary CTA and redirect assume onboarding — now reachable from a live shop too, left unfixed

- **What:** G3 adds a link from `/ma-boutique/modifier` to `/ma-boutique/creer/configuration` (and
  a reciprocal link back), so a returning owner can now reach that page from an already-live shop —
  not only via the onboarding wizard's own "Suivant", the only path that existed before. But
  `ConfigurationForm.tsx`'s primary button is unconditionally labelled `t('boutique.action_create')`
  ("Créer ma boutique") and its success redirect always goes to `/ma-boutique/creer/succes` — both
  correct for the wizard, both WRONG for an owner who is just updating settings on a shop that
  already exists: the copy claims to create a shop that is already created, and the redirect lands
  on the "your shop was just created" screen a second time.
- **Why not fixed in this PR:** the founder's ruling scoped this PR to exactly "two link
  additions" and explicitly flagged `ConfigurationForm.tsx` as a previously-shipped file (PR #129) —
  authorizing the link, not a behavior change to that file's label/redirect logic. Distinguishing
  "reached via onboarding" from "reached via a live shop's edit page" needs a real signal (e.g. a
  `?from=` param threaded through both the page and the form, or a query for whether the shop has
  already passed `/succes`) that is its own small design decision, not a link addition — "one PR,
  one focus."
- **Trigger:** next time `ConfigurationForm.tsx` is touched, or the first report of a returning
  owner seeing "Créer ma boutique" / the creation-success screen on a shop that already exists.

## Corrected two stale claims found during G3 discovery

- **`shops.preferred_carriers` "unused"** (this file, "orders.carrier is seller-writable…" entry):
  was accurate when written, stale since PR #129 gave it a real writer
  (`/ma-boutique/creer/configuration`'s "Livraison" accordion). Corrected in place above — the
  column is written now; G9 still doesn't read it into the order form, which is the part that
  remains open.
- **`docs/design/d1-discovery.md:237`, "Logo boutique… settable nowhere":** was accurate pre-G3 (G2
  could only set it once, at creation, with no revisit path). Corrected in place — G3 is the
  revisit/edit path that closes it, so the row and the summary table's row C are marked resolved
  rather than deleted, per the founder's instruction to narrow rather than remove.
