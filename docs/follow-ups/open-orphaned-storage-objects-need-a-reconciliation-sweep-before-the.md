# Orphaned storage objects need a reconciliation sweep before the first deletable image surface

- **Add to the sweep (2026-10-26, decision S-4):** 5 objects in avatars / shop-assets / product-images /
  portfolio-media have no `uploaded_objects` record (pre-provenance uploads or raw PUTs). Since migration 71
  nothing can publish them; the sweep should list and delete them (and any future ones until S-3 ships).

- **What:** there is **no transaction spanning Postgres and Supabase Storage**, so a row delete
  cannot atomically delete its object and a trigger cannot reliably do it either. Orphans are a
  **reconciliation problem, not a prevention problem.**
- **Why it is not needed yet:** this PR ships exactly one writer — avatars — and the avatar flow
  deletes the prior object in the same server action. There is no CASCADE path that strands an
  avatar object.
- **Why it becomes needed:** deleting a *shop* cascades to `products` and then to `product_images`
  — **the DB rows vanish with no application code involved**, so there is no opportunity for an
  in-action delete to run at all. Same for any raw SQL delete, admin tool, or service-role write.
- **Shape when built:** delete-in-action for the common path, **plus** a periodic sweep that lists
  objects and deletes those with no referencing row in the owning table (`product_images`,
  `profiles.avatar_url`, `shops.logo_url`/`banner_url`, `portfolio_items`). The sweep is
  **required, not optional** — it is the only thing that catches the CASCADE case.
- **Simplified by the closed decision above:** because orders do not reference image paths, the
  sweep's "no referencing row" test stays single-table. No cross-table reference tracking.
- **Trigger:** the first PR that ships a *deletable* image surface — G5/G6/G7 (products) or G3
  (shop assets), whichever lands first.
