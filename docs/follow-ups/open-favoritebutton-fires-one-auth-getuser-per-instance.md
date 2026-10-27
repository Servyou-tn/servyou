# FavoriteButton fires one auth.getUser() per instance
- **What:** `src/components/FavoriteButton.tsx` calls `supabase.auth.getUser()` in a
  per-instance `useEffect` to decide the heart's filled/empty state. A page with N cards
  fires N independent getUser round-trips on mount. The logged-in consumer homepage shows
  products + services together (~19 hearts), so it fans out ~19 getUser calls at once
  (visible as aborted "TypeError: Failed to fetch" in headless tests when the page closes
  mid-flight; harmless in a real browser, just wasteful).
- **Why deferred:** FavoriteButton is a shared component used on every consumer surface
  (/marche, /recherche, /categories, /mes-favoris, homepage); optimizing it (share auth
  state via context, or pass logged-in + favorited-ids from the server page) is its own
  change with its own test pass. Not introduced by the homepage — just surfaced by it.
- **Trigger:** A consumer-performance pass, or when wiring real auth context.
