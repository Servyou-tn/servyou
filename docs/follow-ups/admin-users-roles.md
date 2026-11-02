# Admin users roles + OM shop move (`feat/admin-users-roles`, 2026-11-02)

## The user detail page still shows one role

- **What:** `/admin/utilisateurs/[id]` shows « Rôle » via `roleI18nKey`, where `is_admin` wins, so an admin who is
  also a seller reads « Administrateur » only (it does show the « Voir la boutique » link).
- **Why deferred:** the brief was the list page; one PR, one focus.
- **Where it lives:** `src/app/admin/utilisateurs/[id]/page.tsx` (`Field label={tr('admin.users.field_role')}`).
- **Trigger:** next admin-users PR. Fix: render `accountRoles(u)` badges as the list does.

## Other AR strings use « جار » without the tanwin

- **What:** the founder fixed « جار التحقق… » → « جارٍ التحقق… ». The same form is in `common.loading`
  (« جار التحميل… »), `forgotPassword.submitting` (« جار الإرسال… ») and `newPassword.submitting`
  (« جار إعادة التعيين… »), maybe more (`grep -n "جار " src/lib/i18n/ar.ts`).
- **Why deferred:** the brief named one string; the others are a founder copy call.
- **Where it lives:** `src/lib/i18n/ar.ts`.
- **Trigger:** founder OK → one copy PR for every « جار ».

## Shop creation step 2 shows « Retour à Modifier ma boutique »

- **What:** on `/ma-boutique/creer/configuration` (step 2 of creating a shop), a « Retour à Modifier ma boutique »
  link shows although the shop is still being created (seen during the CSP walkthrough of #292, 2026-11-02).
- **Why deferred:** unrelated to this PR.
- **Where it lives:** the G2 step-2 configuration page.
- **Trigger:** next G2 touch, or founder priority.

## Review lows kept as they are (Sonnet review of #296)

- **A failed shops read hides the whole users list** (error state). Kept on purpose: a list with shop names silently
  missing would read as « no shop ». Revisit if transient shop errors ever block user management — then: list
  without shop links + a banner.
- **Boutique badge comes from `seller_type`, the shop link from ownership.** An account owning a shop with
  `seller_type` NULL would show the link without the badge; `enforce_seller_capability_switch` forbids that state.
- **No pagination:** PostgREST's 1000-row cap would truncate the profiles / shops reads and the filter counts.
  **Trigger:** ~800 accounts — add `.range()` paging and server-side counts.

## Click-through after the OM shop move

Applied 2026-11-02 as `20261102202911_move_om_shop_to_shop_account` (target `moatezservyou@gmail.com`); file renamed
and README entry #117 added in #296; end state verified read-only.

- **What:** a click-through the SQL cannot do: as `moatezservyou@gmail.com`, Modifier ma boutique « Enregistrer »
  with no change, edit + save a product with an image, Commandes reçues shows the 6 orders; as admin, the list shows
  « Administrateur » only and « OM shop » under the new account.
- **Why deferred:** needs the founder's sessions on production.
- **Where it lives:** `/ma-boutique/modifier`, `/mes-produits`, `/commandes-recues`, `/admin/utilisateurs`.
- **Trigger:** next time the founder signs in to either account.
