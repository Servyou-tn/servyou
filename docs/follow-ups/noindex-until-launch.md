# Search engines kept out until the public launch (`chore/noindex-until-launch`, 2026-11-16)

## Open indexing on launch day

- **What:** every response carries `X-Robots-Tag: noindex, nofollow` while `SEARCH_INDEXING_OPEN` is `false`. On launch
  day it becomes `true` (one-line PR; flip the pin in `src/__tests__/noindex-until-launch.test.ts` in the same PR), then
  submit `https://servyou.tn/sitemap.xml` in Google Search Console and request indexing of the home page.
- **Why deferred:** servyou.tn went live on 16 Nov 2026 while production still holds test data (demo shops, test
  orders). Indexing opens only after the test-data wipe (#297) has run.
- **Where it lives:** `src/lib/seo/indexing.ts`, used by `next.config.ts` `headers()`.
- **Trigger:** launch day, right after #297 is applied and the site holds only real content.
