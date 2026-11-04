# F4 « Détail de l'annonce » at 375 + the home page's sideways scroll (`m375-f4-home-ar`)

Mobile batch 1, PR-A3: the last batch page, plus the home-page overflow logged in `docs/follow-ups/ar-singular-voice.md`.
- **F4 frame:** `docs/design/m375-f4-annonce-dump.json` + `.png` (375 × 3169). No Figma MCP read was used.
- **F4 route and components:** `/mes-annonces/[id]`, rendered by `src/components/marche/AnnonceDetail.tsx` and `AnnonceResponseCard.tsx`. Both are used by F4 only.
- **Home component:** `src/components/landing/Problem.tsx` (used by `/` only).

## Method

Same method as #306 / #310.
- **Fixture:** geometry is read from the DOM at 375 (FR + AR, scrollbar hidden) on a temporary fixture route, deleted before the commit. It is a copy of the real F4 page with only auth and the annonce read swapped: the frame's content, an open post with 5 proposals (3 shown) and 4 skills.
- **Offset:** the mobile shell starts the content 24 down where the frame starts at 20, so every « Now » y below is the frame's + 4.
- **Scope:** `max-lg:` overrides only. The cards' own mobile padding is their base class, which `sm:p-6` / `sm:p-5` already override from 640. The home fix is `max-sm:` only.

**From `lg` everything is unchanged.** Each pair is a stash + recapture against `main` on the same dev server: **8 pairs, 0 differing pixels in all 8.**
- F4 full page at 1440 and 1100, FR + AR.
- The home Problem section at 1440 and 1100, FR + AR.

The home page is compared on the changed section, not the whole page. Its hero visual animates in JS, so two full-page captures of the same code differ by about 500 000 pixels (y 484–2282 at 1440), with animations off or not. The section captures are stable: two runs, 0 px.

## F4 — what changed, measured against the frame

| Frame node | Frame | Now (375) |
|---|---|---|
| `back-link` | arrow 20 + « Retour à mes annonces » **14** Semi Bold / 17, blue/600, 185 × 20 | ✓ 184 × 20, 14 / 17, plus a 44 px tap target (py / -my 12; nothing moves). It rendered at **16 / 24**: in its `cn()` call `text-body-sm` sat next to `text-brand-blue-600` and tailwind-merge dropped the size. The 375 size now rides on its own `max-lg:` variant. Desktop keeps the 16 — logged |
| `post-header` | gap 12; chip 29; H1 32 Bold, 80 (2 lines); meta 14 Medium **/ 17**, gaps 16 / 8 | ✓ meta lines 17 (were 21); the rest unchanged ✓ |
| status chip | « Ouverte » as a Badge (29 tall, 14 Medium, blue/50) | the shared `StatusPill` (24, 12 Semi Bold) — Q1 |
| `description-panel`, `proposals-panel`, `decision-card` | pad 24 / 16 with the **1 px stroke inside** → content **311**; titles 14 Semi Bold **/ 17** | ✓ content 311 (was 309); titles 17 (were 21) |
| `client-card` | pad 20 / 16, stroke inside → **279**; gap 12; « Proposition reçue … » 12 Medium **/ 15**; name 16 Semi Bold **/ 19**; « headline · ville » 14 Medium **/ 17**; message 16 **/ 27** | ✓ content 279 (was 275); 15 / 19 / 17 / 27 (were 16.8 / 26 / 21 / 28) — the messages are **135 and 108 tall, equal to the frame** |
| card `meta` | « Prix proposé : … » and « Délai : … » on ONE row (it overflows the 279 in the frame) | two lines, 17 each (were 21): no text change, and both don't fit one row — Q2 |
| card `actions` | WhatsApp **with its 20 glyph** (252 wide) · « Voir le profil » 40 | ✓ the glyph is shown below lg (it had none); 252 × 44 · 40 unchanged |
| `budget` | « Budget » 12 Medium **/ 15**, « 800 TND » 32 Bold **/ 39**, gap 2 | ✓ 15 / 39 (were 16.8 / 40) |
| `competition` | pill 23 (12 Semi Bold **/ 15**, pad 4 / 10); « 5 / 10 · encore 5 places » 12 / 15 | ✓ pill 23 (was 24.8), line 15 |
| `skills` | label 12 / 15; chips 29 | ✓ label 15; chips (shared `SkillChip`) unchanged ✓ |
| `meta` rows | 14 **/ 17**, gap 12 | ✓ 17 (were 21) |
| CTAs | Marquer comme pourvue · Modifier l'annonce · Supprimer l'annonce, 40 each, gap 16 | ✓ unchanged. With proposals received, « Modifier » is the locked state (disabled + the reason), as built |
| « Publié par » card | hidden in the frame | ✓ not rendered |

No horizontal overflow at 375 (FR + AR: `scrollWidth` 375).

## Home — the sideways scroll at 375

`docs/follow-ups/ar-singular-voice.md` logged « 18 px wider than the screen ». That capture measured 378 inside a 360 client width: 15 of the 18 px were the visible scrollbar.

| | Before (`main`) | Now |
|---|---|---|
| `/` at 375, FR | `scrollWidth` **378** | **375** |
| `/` at 375, AR | `scrollWidth` **378** | **375** |
| `/` at 360, FR + AR | — | 360 |

**Cause.** The Problem section's « before » card (four 64 px app blobs, 16 apart, p-6) is **354** wide. That is inside the **327** a 375 screen leaves within the section's px-6, and its grid column cannot shrink below its content. In AR it overflows on the left, into the start gutter; in FR on the right.

The hero's 400 px halo also reaches past the screen, but the hero is `overflow-hidden`, so it never widened the page.

**Fix, below `sm` only.** The card is p-4 (the « after » card's padding) and holds 56 px blobs 8 apart. It is now 282 wide and fits every screen from 330 px. The landing has no 375 frame, so this is a layout repair, not a measured match.

## Every control at 375 (FR + AR)

| Page | Control | Goes to |
|---|---|---|
| F4 | ‹ Retour à mes annonces | `/mes-annonces` (tap 184 × 44 FR, 138 × 44 AR) |
| F4 | « + 2 autres propositions » | expands to the 5 cards (`aria-expanded` true) |
| F4 | Voir le profil (×3) | `/freelance/{freelancer_profiles.id}` |
| F4 | Contacter sur WhatsApp | the phone reveal (not clicked — it reads a phone) |
| F4 | Marquer comme pourvue | opens « Marquer cette annonce comme pourvue ? » / « هل تريد تحديد هذا الإعلان كمُسنَد؟ », cancelled |
| F4 | Modifier l'annonce | disabled with the reason (the post has proposals), as built |
| F4 | Supprimer l'annonce | opens « Supprimer l'annonce ? » / « حذف الإعلان؟ », closed with Escape |
| F4 | the route, logged out | `/connexion?next=/mes-annonces/{id}` (307) |
| Home | `/` | 200; the Problem section has no controls |

## Questions for the founder

1. **F4 status chip.** The frame draws « Ouverte » as a 29 px Badge (14 Medium, blue/50 fill). Ours is the shared `StatusPill` (24, 12 Semi Bold), the same pill as the F3 list. Keep the pill?
2. **F4 proposal meta.** The frame puts « Prix proposé : 750 TND » and « Délai : 3 semaines » on one row; at 279 they don't fit, and the frame clips the second. Ours keeps two lines with the built « Délai proposé : » label (no text change). Keep?
3. **F4 back link on desktop is 16, not 14.** It is the `cn()` eviction above. Fixing it changes desktop pixels, so it is logged, not done. Fix it in its own PR?
4. **Arabic + French user text on F4 (every width, so desktop AR too).** In AR, a French description or proposal message ends with its period on the wrong side (« .disponibilité »), and a typed « 3 semaines » reads « semaines 3 ». User text carries no `dir="auto"`. Logged; fix in its own PR?
