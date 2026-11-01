# Shop social links — database part (`feat/shop-social-links-db`, 2026-11-01)

## Applied
- Migration 116 (`20261101212613_shop_social_links`) was applied by the architect on 2026-11-01. It is recorded,
  the types are regenerated, and the live suites are green (this PR, commit 4, architect's OK).

## For the UI PR (not this one)
- **Edit page** (`/ma-boutique/modifier`, `updateShopAction`): validate with `ShopSocialLinksSchema`
  (`src/lib/shops/social-links.ts`) and pass its output straight to `.update()`. Map the issue message
  `invalid_<platform>_url` to a field error.
- **Public shop page** (D3) and any other reader: name the three columns explicitly in the `select`. SELECT on
  `shops` is column-granted, so `select('*')` is not allowed. The links kit (`src/components/social/*`) shows them.
- A link the database accepted always passes `detectPlatform` as its own platform; the reverse is not true:
  `detectPlatform` takes any subdomain (`vt.tiktok.com`, `www.m.facebook.com`), the database only the listed hosts.
  The edit form should validate with this module, not `detectPlatform`.
- `ShopSocialLinksSchema` needs all three keys as strings (`''` clears a field). For a partial save or a `null` from
  the form, wrap it with `.partial()` or map `null` to `''`. Otherwise the user gets a generic type error.
- (LOW, from review) After the host, the path may still hold invisible or bidi characters (U+200B, U+202E…). The
  host can't be spoofed, but if the UI ever prints the URL text instead of the platform icon, render it `dir="ltr"`
  or show the icon only.

## Decided
- Short and mobile hosts (architect, 2026-11-01, « same as freelancer links »): `vm.tiktok.com`, `m.tiktok.com`,
  `web.facebook.com`, `fb.me` and `instagr.am` are accepted, as exact hosts. Widening further needs a new migration
  (the CHECK) plus the same pattern in `social-links.ts`. The drift test enforces the pair.
