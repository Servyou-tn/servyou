# « Signaler ce produit / ce service » PR-B3 — logged, not fixed (feat/signaler-product-service)

Ranked.

1. **MEDIUM (DB-guardian) — `reports` has no dedupe and no rate limit.** No unique index on `(reporter_id, target_type, target_id)` and no
   per-user throttle, so one account can file unlimited reports against one target (the shop and freelancer actions have the same hole).
   Candidates: a partial unique index on open reports per reporter+target, and/or a trigger capping reports per user per hour. The
   new action's existence check closes the « report an arbitrary uuid » hole but not this one.
2. **LOW — migrate the two older report modals onto `ReportListingModal`** (`boutique/[id]/_components/ShopReportModal.tsx`,
   `freelance/[id]/_components/FreelancerReportModal.tsx`). They are hand-rolled divs: no focus trap, no Escape, no scroll lock, backdrop
   `bg-black/40` instead of `bg-overlay-scrim`. The shared component would need a `kind` extension (shop / freelancer_profile) and a
   per-kind reason list (3 reasons, no `wrong_category`). Left untouched here (once built stays built).
3. **LOW — missions and users still have no report UI**, although `reports.target_type` already allows `job_post` and `user` and the admin
   queue handles them. When one ships, update `aide.g.securite.a2` (FR + AR) — it currently tells users to write to support for those two.
4. **LOW — the admin queue's rendering of a product/service report was not checked** (no admin session). The « Voir » links were broken and
   are fixed in this PR (`/produit` → `/produits`, `/service` → `/services`); the hide / unhide moderation section already covered both tables.
5. **LOW — the reason list is mine, not the frame's.** 563:39705 draws the select closed. The four options (the full `reports.reason` CHECK)
   follow the older ProductDetail comment (« the modal's four options one-for-one »); if a design pass wants three, drop `wrong_category` in
   `lib/reports/listing-report.ts` and the two `report.listing.reason_*` keys stay harmlessly unused.
6. **INFO — failures are shown inline in the dialog, not as toasts.** A modal dialog's top layer (and its `::backdrop`) paints above sonner, so a
   toast fired while it is open would sit dimmed under the scrim. Only the success toast is used (it fires as the dialog closes). Any future
   modal built on `<dialog>` should do the same.
7. **INFO — the submit path for a PRODUCT report was not exercised against a real shop's product** in the browser (a production write); the
   service path was, end to end. The two share one action; the product branch is covered by the mocked test (table routing, filter, row).
8. **INFO — a leftover test row** was filed in production by the end-to-end test: report `0eb6533f-9c08-4305-9e90-a5bd4af466ca`
   (« [test B3] à supprimer », demo service, `wrong_category`, `open`). Its deletion was declined by the permission layer, so it needs a
   manual dismiss/delete from `/admin/signalements`.
