# Upload hardening (`fix/upload-hardening`, 2026-10-30)

## 1. LOW-MED — no cap on upload COUNT (founder number needed)
- **What:** from audit pass 2 « Logged ». `uploadProductImageAction` accepts any owned `productId` and
  `MAX_PRODUCT_IMAGES` (8) is enforced only when `product_images` rows are inserted, so a seller can store
  unlimited normalized objects (≤ 2 MiB each) under a product. Portfolio uploads have no cap at all. Every upload
  writes an `uploaded_objects` provenance row (owner, bucket, path), so a cap is a cheap service-role count.
- **Why deferred:** the cap is a product number, not a code decision (CLAUDE.md: do not invent product decisions).
- **Proposal:** product images — refuse when the product's folder already holds `2 × MAX_PRODUCT_IMAGES` (16)
  provenance rows, which leaves room for replacements; portfolio — refuse at N rows per freelancer (N = the portfolio
  item cap × 2, if one exists, else a founder number). Orphans count until the reconciliation sweep
  (`open-orphaned-storage-objects-need-a-reconciliation-sweep-before-the.md`) removes them.
- **Trigger:** founder picks the numbers → small app PR (no migration).
