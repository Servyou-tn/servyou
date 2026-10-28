# Loader error surfacing PR-1 — logged, not fixed (fix/loader-error-surfacing-pr1)

PR-2 scope per `docs/design/loader-error-surfacing-plan.md`; ranked.

1. **LOW — `ma-boutique/creer/configuration/actions.ts:101`**: `getProductCategories()` now throws a `QueryError` mid-action, after the
   payment-methods reconcile was written, so a categories outage rejects the action instead of returning `{ ok: false, error }` and
   leaves a half-saved config. Wrap the call and return the generic error (server actions are PR-2).
2. **LOW — `?categorie=` slugs go into `.in('slug', …)` unfiltered**: a crafted value (`a"b`) may raise PGRST100, which used to read as
   0 results and is now an ErrorState + a Sentry event. Unverified; a slug-charset filter in `parseSearchParams` would keep crafted URLs quiet.
3. **LOW — `devenir-vendeur/page.tsx:37`** (public): `getCurrentProfile()` now throws for a signed-in visitor during a profiles outage, a
   new 500 on a public route. Matches ruling 3 (no guessing the role); revisit if the founder prefers the signed-out look there.
4. **INFO — `getSellerOrderDetail`'s `strict` parameter is now a no-op** (every non-no-row failure throws); remove it and its H8 caller
   argument in a later cleanup.
