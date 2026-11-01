# D4 « Profil freelance public » — mobile 375 (`m375-d4-profil`)

Mobile batch 1, page 5. Frame: `docs/design/m375-d4-profil-dump.json` (+ `.png`, untracked), 375 × 3713. Route `/freelance/[id]`, component
`src/app/freelance/[id]/_components/FreelancerDetail.tsx`. Rule: the mobile shell stays (header, search, page background); this PR matches the
page CONTENT, as `max-lg:` overrides. **From `lg` the page is unchanged**, pixel-compared with `main` at 1440 in FR + AR on two pages:
- a fixture with every section filled (portfolio, formation, certifications, contexte, external portfolio, plus a bio with a CRLF break, two
  blank lines in a row and a single line break): **identical**;
- a real profile: only hearts caught while loading differ.

## Founder rulings for this page

- **Approved change — the sticky contact bar stays on mobile** (not in the frame). It is the existing `StickyBar`: avatar, name and the
  primary CTA, docked under the top bar once the hero scrolls away. Unchanged.
- **« Verified » badge — ruling received, not applied: it needs a rule (Q1).** My earlier note said the frame has no Verified badge. That was
  wrong: the frame draws one (clipped by the avatar, so it doesn't show in its render). The live page never had one: an earlier ruling cut
  it at every width because no verification data exists (no column, no `VerifiedBadge` component; `Avatar` omits it on purpose). So there is
  nothing to keep.
- **Everything else follows the 375 frame**, so the section nav under the hero is gone below `lg` and « Ses services » uses the frame's own card.

## What changed, measured against the frame

Geometry is read from the DOM at 375 (FR + AR, scrollbar hidden) on a temporary fixture route with the frame's content: no production
profile has portfolio items, formation or contexte. The fixture was deleted before commit.

| Frame node | Frame | Now |
|---|---|---|
| hero | full width, no card; `banner` 375 × 120; `avatar-ring` 96 at x 16 / y 72 (Avatar 80) | was a bordered card inside the gutter with a 200 banner and a 128 ring. Now it bleeds to the screen edges below the header, banner 120, ring 96 with p 8 ✓ |
| `identity` | p 64 / 16 / 0, gap 16; `name-grp` gap 6: name 32 Bold line 38, headline 18 | name 30 → 32 (`text-h1`, line 38), name + headline grouped (gap 6), meta 16 below |
| `meta` | 14 Regular **text/muted**, icons 16, gap 20 / 6 | text-secondary → muted |
| `trust-row` | 343 × 146, p 16 / 24, r 10; values 24 Bold line 30; captions 12 Medium; dividers 1 × 40; 2 × 2 | ✓ 343 × 146. Values 20 → 24, captions Medium, dividers 32 → 40, rows 12 apart. The frame's captions are lowercase (« projets livrés », « d'expérience »): `lowercase` below `lg`, the strings are unchanged. The divider that would open the second row is dropped there |
| `actions` | WhatsApp 44 (glyph 20 + label 16 Semi Bold), Partager secondary md 40, ⋮ 20 × 40; rows 8 apart, p 8 / 0 | WhatsApp 48 → **44 with the glyph** (from `lg`: 48, no glyph, as before). « Signaler » text → **⋮ icon** in a 44 target (same report modal, same accessible name « Signaler »). Partager 101 wide: the frame's 120 includes the « 3 » badge cut by an earlier ruling, and its placeholder « + » icon isn't drawn either. No phone (most visitors): « Demander un service » is 44 too, with the same rows |
| section nav under the hero | — | hidden below `lg` (the sticky bar keeps its own, desktop-only) |
| every box | full width 375, r 12, 1 px stroke, p 20 / 16, gap 16 (Portfolio + Services gap 20) | was inside the 16 gutter with p 24. Now it bleeds, r 12, and pads 19 / 15 (Figma strokes sit inside the frame, CSS borders take 1 px), so the content box is the frame's 343 at x 16 ✓ |
| `bio` | paragraphs 16 / 27, **14 apart** | was one pre-line block. Now one `<p>` per paragraph (a blank line = a paragraph break): 14 apart at 375, 26 from `lg` (exactly the blank line it replaced) |
| group labels | 12 Semi Bold, **sentence case** | uppercase + tracking dropped below `lg` |
| chips | 29 tall, surface/sunken, 14 Medium, **a placeholder icon** (icon-banknote on every chip) | ✓ 29, without the icon: no per-skill icon exists (Q3) |
| `g-langues` | « Arabe » 14 Semi Bold + « — Natif » 14 muted, gap 6, rows 8 apart | level text-secondary → muted, gaps 8 → 6, rows 6 → 8 |
| `BOX Portfolio` | **border/strong**; title 24 Bold + « 3 réalisations » 12 Medium; pieces FLAT: cover 343 × 160 r 10, title 16 Semi Bold (22), desc 14 muted, « Voir le projet → » 12 Medium blue, gap 8 | was bordered cards with a 222 cover. ✓ 635 tall like the frame |
| `ext` | « Portfolio externe : » 14 muted + link 14 Medium blue, gap 4, no divider | divider dropped, label muted; the platform icon before the link stays (founder ruling, links kit) |
| `BOX Ses services` | **border/strong**, title 24 Bold + count; **« ServiceCard / context=public »** 343 × 247 | new `PublicServiceCard` (below `lg` only): 44 blue-50 band with the briefcase and the heart at the end (44 target), body p 16 gap 10, title 18 Semi Bold, description 14 muted on one line, category badge, « À partir de » 12 over the price 18 Bold (centred, as drawn), avatar 24 + name 13 Medium; **no « Voir le service » button** (the card is the link). ✓ 343 × 247, box 600 like the frame. From `lg`, the v3.7 grid card as before |
| `BOX Formation & certifications` | entries surface/subtle, p 14 / 16, **no icons**; title 16 Semi Bold (22) + line 14 muted; certificate « Voir le certificat → » 14 Medium blue under the year | icons hidden, sunken → subtle, certificate rows stacked (link under the year) in the same entry style; the divider between Formation and Certifications dropped. Formation entry 96 ✓ |
| `BOX Contexte de travail` | rows: label 12 Semi Bold + value 16 / 26, 16 apart | rows 12 → 16 apart, value line 24 → 26. « Informations complémentaires » stays cut (no column) |

## Questions for the founder (not decided by me)

1. **« Verified » badge.** You said to keep it, but there is none to keep: D4 never shipped it (your earlier ruling) and there is no
   verification data. Drawing it on every profile would tell buyers every freelancer is verified. I can build it in one small commit
   once there is a rule for who counts as « vérifié » (e.g. phone confirmed? an admin check?). That rule probably needs a column, which is
   agent A's area.
2. **The heart in the hero** (B6, added at your request) is not in the 375 frame. I kept it: removing it would take away the only way to save a
   freelancer on mobile. It sits on the WhatsApp row (that row wraps differently than the frame by one 44 px button).
3. **Chip placeholder icons.** Every chip in the frame carries the same icon-banknote. They read as a component default, so I didn't draw them.
4. **Page background.** The frame's root is white; the shell's page is surface/subtle (shell ruling stands, same as D2). The gap between boxes
   shows the light grey instead of white.
5. **Ratings.** The frame's trust row shows « ★ 4.8 / 12 avis ». We keep the « Nouveau sur Servyou / Pas encore d'avis » state (ratings are
   Phase 3+). This pill is wider than the rating, which is why the divider after « 12 projets livrés » is dropped when the row wraps.

## Verified

tsc · eslint on every changed file · vitest by path (`PublicServiceCard.test.tsx` new, `phone-reveal-ui.test.tsx`). Browser: FR + AR at 375 on
the fixture (box heights 146 / 635 / 600 / 247 / 96 match the frame), in both CTA states (WhatsApp; « Demander un service »), and on a real
profile. AR mirrors, and digits stay LTR (« 1500 د.ت »). FR + AR at 1440: see the top of this doc.

## Review round (#289)

- Bio split on exactly one blank line, after normalising CRLF, untrimmed. The first split (`\n\s*\n` + trim) merged a run of blank lines
  into one gap at 1440.
- `PublicServiceCard`: no `overflow-hidden` (it clipped the link's focus ring); the band rounds its own top.
- The trust-row divider is hidden below `sm` only (from `sm` the four segments fit on one row).
- No phone: « Demander un service » is 44 below `lg`, like the WhatsApp state.
- Logged, not fixed: the double card render (double heart reads), `WhatsAppGlyph`'s third consumer, StickyBar bleed between md and lg.
