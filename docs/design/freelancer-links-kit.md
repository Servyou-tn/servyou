# Freelancer links kit — PR-1 (kit + D4 hero + H3 editor)

Founder-approved Oct 31. One source of truth for "a link to a platform": which platform, which icon, which suggestions, how it is shown and edited.
PR-2 (H2 step 2, H12 proposal rows, AnnonceResponseCard + SentRecap, dashboard « Force du profil ») reuses it.

## What ships in PR-1

| Piece | File |
|---|---|
| Platforms, detection, suggestions, top sector, cap | `src/lib/social/platforms.ts` (+ `platforms.test.ts`, 55 tests) |
| Icons (monochrome, `currentColor`) | `src/components/social/PlatformIcon.tsx`, `platform-icon-paths.ts` |
| Public row of icons | `src/components/social/SocialLinks.tsx` |
| One address field with the detected icon | `src/components/social/PlatformLinkInput.tsx` |
| « + LinkedIn » chips | `src/components/social/RecommendedPlatforms.tsx` |
| The H3 editor (max 5, counter, « Autre plateforme ») | `src/components/social/LinksEditor.tsx` |
| Top sector of a freelancer's listings | `src/lib/marche/freelancer-top-sector.ts` |
| Pages | D4 `/freelance/[id]` (hero « Liens » + « Portfolio externe » icon) · H3 `/mon-profil-freelance/modifier` « Confiance & liens » |
| Save | `LINKS_CAP` 3 → 5 (= `LINKS_MAX`), schema max 5, DB hint `freelancer_links_cap` → « 5 liens maximum » (FR/AR) |

## Decisions applied

- **12 platforms**: LinkedIn, Facebook, Instagram, TikTok, YouTube, Behance, GitHub, Dribbble, Upwork, Fiverr, Malt, Site web (globe, for any other site —
  ProZ, SoundCloud, Vimeo, X…).
- **Detected from the address, by exact host or subdomain — never by substring.** `github.com`, `www.github.com`, `gist.github.com` are GitHub;
  `evilgithub.com`, `github.com.evil.io`, `https://github.com@evil.io` are not (tested, 12 look-alike shapes). A bare `linkedin.com/in/x` is stored with `https://`
  (`normalizeUrl`); anything that is not an http(s) address is left as typed and refused by the existing http(s) check (`javascript:`, `mailto:` still rejected).
- **What is a saveable link** (`isLinkUrl`, client check AND server schema): http(s), a dotted host, **no `user:password@`** (`https://github.com@evil.io` opens evil.io
  but reads as GitHub; a pasted email is not turned into a link), ≤ 500 characters once `https://` is added. `host:port` (`linkedin.com:443/in/x`) is a host, not a scheme;
  `//example.com` loses its slashes; `https:github.com` (no `//`) is refused. A « + LinkedIn » hint only speaks for an EMPTY row — a typed address is what it is.
- **No free label field.** A link's name is its platform, derived at save (`linkRowsToPayload`): a saved link that had a custom label (« Mon Behance ») becomes
  « Behance » on the next save — the approved change to H3. Save stays delete-then-reinsert (unchanged).
- **Suggestions** = the sector table in `RECOMMENDED_BY_SECTOR` (13 sectors, founder lists) for the sector that holds most of the freelancer's non-draft listings
  (`service_listings.category_id`, tie → most recent listing); no listing → LinkedIn, Facebook, Instagram, Site web, Upwork. Already-added platforms disappear
  from the chips. If the read fails it is logged and the defaults show (a suggestion is not worth a broken page).
- **« Portfolio externe »** stays its own field; on D4 its line now carries the platform icon.

## Icons — source and licence

| Platform | Source | Licence |
|---|---|---|
| LinkedIn, Facebook, Instagram, TikTok, YouTube, Behance, GitHub, Dribbble, Upwork, Fiverr, Malt | `simple-icons` **v13.21.0** (path `d` copied; the package is NOT a dependency; ~9 KB of path data) | CC0 1.0 (public domain) |
| Site web (globe) | lucide-react `Globe` (already a dependency) | ISC |

Why not Figma's own exports: the Figma MCP hit its Starter-plan call cap, so the icons could not be exported. The frame's three icons (GitHub, LinkedIn,
globe; `m375-d4-profil` → `c4-liens`) are 20 × 20, `text/secondary`; ours are the same size and colour. If the founder wants the Figma vectors swapped in,
they are one file (`platform-icon-paths.ts`). The brands' trademarks belong to their owners; the glyphs only identify where a link goes.
simple-icons v14+ dropped LinkedIn at its owner's request, hence the pin to 13.21.0.

## D4 hero — Figma vs preview

`compare/links-kit-d4-hero-375-figma-vs-preview.png` (frame left, FR and AR preview right; fixture data, the route was removed afterwards — production has no saved
links yet).

Measured against `m375-d4-profil` `c4-liens`: segment 43 tall ✓ · « Liens » caption 12 Medium `text/muted` ✓ · caption → icons gap 6 ✓ · icons 20 × 20
`text/secondary` ✓ · the first icon flush with the caption (FR) / the right edge (AR) ✓. 1440 and 375, FR and AR: no horizontal scroll.

### Questions for the founder (not decided by me)

1. **Icon spacing.** The frame draws the icons 14 apart (pitch 34). The kit keeps a **44 × 44 tap target on a phone** (project rule), so the pitch is 44 at 375
   (36 from `sm`: pitch 36). Same glyphs, wider gaps. Keep the 44 rule, or shrink the targets to match the frame?
2. **Row wrapping.** In the « nouveau » trust state (no rating — founder ruling) the hero row has 3 segments + links; at 375 the links segment wraps to its own
   line. The frame shows the 4.8★ state, which is cut. No change made.
4. **RTL address field.** The address is LTR (`dir="ltr"` on the input), the field box follows the page: in AR the platform glyph sits at the right edge, the text
   starts at the left. Same as the other LTR fields in the DS; confirm against the Figma AR frame when available.
3. **H3 accordion.** `404:11909` (1440) was not re-read (MCP cap). The editor replaces the two free inputs per row by one address field + chips — the approved
   change; layout otherwise unchanged. Please check it against the frame when the quota allows.

## Verified

- `npx tsc --noEmit` clean · eslint on every changed file clean.
- Vitest by path: `platforms.test.ts` (55), `social-kit.render.test.tsx` (17), `links-cap-save.test.ts` (4), `form-errors-retranslate`, `i18n-parity`,
  `category-embeds-hint-guard`, `portfolio-cap-save`: all green.
- Browser (gate account, own session, no writes): H3 FR/AR × 375/1440 — chips follow the sector (design-ui-ux: Dribbble, Behance, LinkedIn, Site web, Malt),
  typing `behance.net/aya` / `https://github.com/aya` / `https://aya.tn` shows the Behance / GitHub / globe glyph, taken platforms leave the chips, the counter
  reads 3/5, RTL mirrors, no horizontal scroll. D4 fixture FR/AR × 375/1440: links named « Profil {Plateforme} de {nom} » / « ملف … الخاص بـ … », `rel="noopener noreferrer"`,
  44 px (36 from `sm`) targets.
- Found and fixed in the browser: the chip's text « + » is bidi-neutral and rendered as « Malt + » in Arabic → it is now a `Plus` icon.

## Coordination with agent A

- The DB cap (`freelancer_links_cap`) is agent A's migration; this PR only maps its hint and lowers nothing. Until it is applied the app-side cap (schema `max(5)`)
  is the only gate.
- i18n keys added in `fr.ts`/`ar.ts`: `social.*`, `links.editor.*`, `freelance.edit.links_cap_reached`, `freelance.public.links_label` (inserted next to existing
  `freelance.edit.links_title` / `freelance.public.link_copied`). Dead keys left in place: `freelance.edit.link_label_field`, `link_url_field`, `add_link`, `links_helper`
  (cleanup is a follow-up, to keep the shared-file diff small).

---

# PR-2 — H2, H12, the application cards, « Ajoutez vos liens » (stacked on #278)

Founder answers to PR-1's questions (Oct 31): **(1)** each icon's tap target is **34 × 34** (20 px glyph + 7 px each side) at every width — glyphs sit 14 apart like the
frame, 34 passes WCAG 2.2 AA (≥ 24); **(2)** links on their own line in « Nouveau » at 375: OK; **(3)** H3 spacing/type stays consistent with the other accordions,
founder compares to 404:11909 in the Nov 6–10 review; **(4)** AR field: icon at the start side, the address LTR — correct; renaming saved links to their platform: approved.

| Page | Change |
|---|---|
| `SocialLinks` (D4 hero, anywhere) | tap target 44/36 → **34 × 34**, no gap; D4's negative margins now −7 px so the « Liens » segment is still 43 tall and flush with its caption |
| H2 `/mon-profil-freelance/creer/competences` | « Portfolio externe » is a `PlatformLinkInput` (glyph of what is typed); `behance.net/aya` is accepted and stored `https://behance.net/aya` |
| H12 `/missions/[id]/proposer` | each row's address is a `PlatformLinkInput`; the row keeps its own **label field and its cap of 3**; the form sends `normalizeUrl(url)` (client check and DB trigger need a scheme) |
| `AnnonceResponseCard` (« Voir les propositions ») + `SentRecap` (H13) | a 16 px `PlatformIcon` in front of each proposal link — the platform of the address, the globe for any other site; the link text / `nofollow` are unchanged |
| Dashboard « Force du profil » | 5th item « Ajoutez vos liens » / « أضف روابطك », done when ≥ 1 saved link (`freelancer_links` head count). Denominator 4 → 5: a freelancer with the 3 real items done now reads 60 % (was 75 %); the portfolio item still never counts (Ruling 2) |

Notes
- Verified in the browser (gate account, own session, no writes): dashboard FR/AR × 375/1440 shows the 5th item, no horizontal scroll. `SocialLinks` / `LinksField` /
  `PlatformLinkInput` on a temporary client fixture (deleted): 34 × 34 targets at pitch 34, FR/AR, glyphs follow the typed address.
- **Not browser-verified:** H12 and H2 as pages. The gate account is redirected from `/proposer` (it cannot answer these missions) and already has a profile (H2). Both
  are covered by the jsdom tests (`ProposalForm.test.tsx`: a bare address is sent as `https://…`; link-row behaviour unchanged).
- The DB cap (agent A, migration `20261031211305_freelancer_links_cap`, hint `freelancer_links_cap`, 23514) is now on `main`; the H3 save maps that hint (#278).
- Question: the Force du profil ring changes from /4 to /5 for every freelancer — confirm that is the intended effect of « a new item ».

