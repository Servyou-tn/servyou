# Loader error surfacing PR-2 — logged, not fixed (fix/loader-error-surfacing-pr2)

Out of scope for PR-2 per `docs/design/loader-error-surfacing-plan.md`; ranked.

1. **LOW — the four other `isCallerActive()` callers still say « suspended » when `is_active_user()` itself fails**:
   `app/actions/products.ts`, `app/ma-boutique/creer/actions.ts`, `app/ma-boutique/modifier/actions.ts`,
   `app/mon-profil-freelance/modifier/actions.ts`. PR-2 added the tri-state `callerActivity()` in
   `lib/images/upload-guard.ts` and switched only `mon-compte` (in scope). Same two-line swap for each; the
   upload stays refused either way (fail closed), only the message is wrong.
2. **LOW — `lib/marche/data.ts:57,136` log raw error objects** (`getActiveProducts` / `getActiveServices`). No app
   callers (tests only, per the plan), so left alone; fix or delete with that module.
3. **LOW — admin user detail renders hard-coded `'Oui' / 'Non'`** (`app/admin/utilisateurs/[id]/page.tsx`,
   `field_admin`) — pre-existing, not through `t()`, wrong in AR.
4. **LOW — `admin/signalements` and `admin/utilisateurs` format dates with the server timezone**
   (`toLocaleDateString`), unlike `admin/litiges` which uses `formatTunisDate`. Pre-existing.
5. **INFO — client-side auth/order errors are logged (message/code), not sent to Sentry.** Deliberate: invalid
   credentials and rate limits would flood it. Revisit if the founder wants client-side reporting with a filter.
6. **INFO — the admin pages render the marketplace `ErrorState` card** (rounded-2xl + shadow) inside the older
   gray admin styling. Functionally right (ruling 1); a visual pass belongs with the admin redesign.
