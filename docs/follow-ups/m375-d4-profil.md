# Follow-ups — mobile page 5, D4 « Profil freelance public » (`feat/m375-d4-profil`, 2026-11-01)

## Each service is rendered twice on D4 (mobile card + desktop card)

**What** « Ses services » renders `PublicServiceCard` below `lg` and `ServiceListingCard` from `lg`, both in the DOM (one is `display:none`).
Each card holds a `FavoriteButton`, and each one runs its own `getUser()` + `favorites` read on mount, so the heart reads double on D4.

**Why deferred** A freelancer has a handful of services, so the cost is a few extra small reads. The real fix is the favourites state loaded
once by the page (as `FavoriteHeart` does for shops/freelancers), not per button. That is a FavoriteButton refactor that touches every card page.

**Where it lives** `src/app/freelance/[id]/_components/FreelancerDetail.tsx` (services section), `src/components/FavoriteButton.tsx`.

**Trigger** The FavoriteButton refactor, or a freelancer with many services.

## `WhatsAppGlyph` now has a third consumer

**What** `WhatsAppContactButton` imports `WhatsAppGlyph` from `src/components/aide/` (D4's 375 button draws the glyph in text/primary; the
brand SVG in `/public` is green-on-white and would vanish on the green). That is its third use (OrdersList, Aide, here). Per the
promote-at-the-third-consumer rule it belongs in a shared icons place.

**Why deferred** A move across feature folders is out of this page's scope.

**Where it lives** `src/components/aide/WhatsAppGlyph.tsx`.

**Trigger** The next PR that touches it.

## StickyBar bleeds less than the hero between md and lg

**What** `StickyBar` pulls out of the page padding with `-mx-4 sm:-mx-6`, but the shell's `<main>` pads `px-4 md:px-8`. Between 768 and
1023 the bar is 16 px short of the edges on each side, while the hero above it (this PR) now bleeds fully. This predates the PR but is
more visible next to a full-bleed hero (review of #289).

**Why deferred** Pre-existing and outside the 375 frame. The fix is one class (`md:-mx-8 md:px-8`) but it touches the founder-kept bar.

**Where it lives** `src/app/freelance/[id]/_components/StickyBar.tsx`.

**Trigger** The next D4 PR, or a tablet pass.

