# Fix packet 1 — seller phone, true counts, product checks (`fix/packet-1-phone-counts-product`, 2026-11-03)

## A seller can clear the contact phone after publishing

✅ CLOSED — #303 (2026-11-03): `updateProfileAction` refuses it (`sellerPhoneClearBlocked`, field error « Le numéro de
téléphone est requis… ») for a shop owner or a freelancer with an active service; DB side in
`PENDING_seller_phone_not_cleared.sql` (awaits apply). The Mon compte helper text still reads « Optionnel ».

- **What:** `updateProfileAction` (Mon compte) still accepts an empty phone for an account with `seller_type` set, so a
  freelancer or shop owner can publish with a phone and then remove it — the « contact sur WhatsApp » promise breaks
  again. Cheapest close: refuse an empty phone in `updateProfileAction` when `seller_type` is not null (and the same
  rule in the DB: a profiles BEFORE UPDATE OF phone trigger, or a CHECK on `(seller_type is null or phone is not
  null)` — the CHECK would fail today on 9 phone-less freelancers, so a trigger on the change only).
- **Why deferred:** the brief covered publish and shop creation; this is the next hole and needs a founder call on
  the Mon compte copy (« Optionnel » helper today).
- **Where it lives:** `src/app/mon-compte/actions.ts`, `MonCompteForm.tsx`.
- **Trigger:** founder OK.

## 9 freelancers (12 active services) have no phone

- **What:** live 2026-11-03 — 9 of 10 freelancers have `phone = NULL` (mostly the 9 demo accounts of the pre-launch
  wipe, PR #297), owning 12 of the 21 active services. They stay active (founder: report, don't touch); if paused, they
  cannot be reactivated without a phone.
- **Why deferred:** founder ruling.
- **Where it lives:** production data.
- **Trigger:** the pre-launch wipe (#297) removes the demo accounts; re-count after it.

## Écosystème counts: statuses

- **What:** `ecosystemCounts` counts distinct buyers of the freelancer's non-cancelled service orders (pending
  included), freelancers buying as consumers with the consumers. « qui ont utilisé vos services » could argue for
  received-only.
- **Why deferred:** a copy / product call, not a bug.
- **Where it lives:** `src/lib/marche/freelancer-dashboard.ts` (`ecosystemCounts`).
- **Trigger:** founder ruling.
