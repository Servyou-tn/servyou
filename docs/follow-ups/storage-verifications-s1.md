# S1 — verifications bucket has no client writer (`fix/storage-verifications-no-insert`, 2026-10-30)

## 1. Re-add a verifications writer when identity verification is built
- **What:** migration 104 (`20261030100604`) dropped « verifications: owner uploads own document ». Nothing can
  write to the private bucket except the service role.
- **Why deferred:** identity verification is not built; the policy let any signed-in account store up to 10 MB per
  object, unbounded, for nothing the app reads.
- **Where it lives:** the migration's rollback block has the exact policy. Prefer the S-3 shape instead (service-role
  upload in a server action after ownership + `isCallerActive()`, `src/lib/images/upload-guard.ts`).
- **Trigger:** the identity-verification PR. If it re-adds a client INSERT policy, flip the active control in
  `src/__tests__/suspension-enforcement.test.ts` (storage block) back to a success. The restrictive suspension
  policy becomes observable again.

## 2. Pass 2 audit still says verifications allows a client INSERT
- **What:** `docs/audits/prelaunch-security-audit-pass-2-actions.md:73` reads « verifications still allows a direct
  client INSERT ».
- **Why deferred:** a dated audit record; not edited in a feature PR.
- **Where it lives:** that line; closed by migration 104.
- **Trigger:** the next audit pass or docs tidy — annotate « closed by 104 ».
