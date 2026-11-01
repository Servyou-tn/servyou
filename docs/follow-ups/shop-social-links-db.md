# Shop social links — database part (`feat/shop-social-links-db`, 2026-11-01)

## After the architect applies the migration (this PR, commit 3)
- Rename `PENDING_shop_social_links.sql` to the recorded version and add its README entry.
- Regenerate `src/lib/supabase/database.types.ts`; the columns don't exist live yet.
- Run `shop-social-links-live.test.ts` and `client-write-grants-live.test.ts`.

## For the UI PR (not this one)
- **Edit page** (`/ma-boutique/modifier`, `updateShopAction`): validate with `ShopSocialLinksSchema`
  (`src/lib/shops/social-links.ts`) and pass its output straight to `.update()`. Map the issue message
  `invalid_<platform>_url` to a field error.
- **Public shop page** (D3) and any other reader: name the three columns explicitly in the `select`. SELECT on
  `shops` is column-granted, so `select('*')` is not allowed. The links kit (`src/components/social/*`) shows them.
- A link the database accepted always passes `detectPlatform` as its own platform; the reverse is not true
  (see the decision below).
- `ShopSocialLinksSchema` needs all three keys as strings (`''` clears a field). For a partial save or a `null` from
  the form, wrap it with `.partial()` or map `null` to `''`. Otherwise the user gets a generic type error.
- (LOW, from review) After the host, the path may still hold invisible or bidi characters (U+200B, U+202E…). The
  host can't be spoofed, but if the UI ever prints the URL text instead of the platform icon, render it `dir="ltr"`
  or show the icon only.

## Open decision (architect / founder)
- The hosts are exactly the ruled list, so `vm.tiktok.com/…` (what TikTok's mobile « Partager » produces),
  `m.tiktok.com`, `fb.me/…`, `instagr.am/…` and `web.facebook.com` are refused. The freelancer links kit accepts all
  of them. Widening needs a new migration (the CHECK) plus the same pattern in `social-links.ts`. The drift test
  enforces the pair.
