# H12 « Envoyer ma proposition » + H13 « Proposition envoyée » — build notes (missions PR-2)

Built from `docs/design/h9-h13-measurements.md` §3–4 and the architect rulings (D-H12-1…8, D-H13-1…5). **No new Figma reads.** Specimens that were never read (`356:*`, `369:*`, `374:*`, `378:*`) were built from the design notes and are flagged below for the post-Pro fidelity pass.

DB state used (all live): M-A `response_count`, M-B responder-read policy + `has_responded()`, M-C `proposed_price_tnd` / `proposed_timeframe` / `portfolio_links` / `job_response_skills`, typed `HINT` codes, message 20–1000 chars (CHECK, NOT VALID).

## Built

| Piece | Where | Notes |
|---|---|---|
| H12 route | `app/missions/[id]/proposer` | server guard = H10's (logged out → sign-in; non-freelancer → back to the mission); **L2 re-check on load**: anything but « can respond » goes back to H10 (or on to H13 when already answered) |
| Server action | `proposer/actions.ts` | Zod shape → `validateProposal` (same pure fn as the form) → `freelancer_id` = session user → skills ⊆ pool → INSERT under the user's session → skills INSERT (non-fatal) → revalidate + redirect. Never logs the raw error |
| Typed errors | `lib/marche/proposal-errors.ts` | maps `error.hint`, never the French sentence. `duplicate` = idempotent success (redirect to H13) |
| Form | `proposer/_components/ProposalForm.tsx`, `LinksField.tsx` | controlled state; errors are i18n keys |
| `SkillsPicker` | `components/missions/SkillsPicker.tsx` | new (no Figma component — specimen `369:2696` is a drawn panel). Reused by PR-4 |
| In-place failures | `InlineNotice.tsx` + `ProposalForm` | amber, never red; terminal failures make the form read-only and keep the message with a copy button |
| H13 route | `app/missions/[id]/proposition-envoyee` | server-rendered from the persisted response; message-only proposals hide the empty rows |
| CTAs | `MissionCta.tsx` | « Envoyer ma proposition » → H12, « Voir ma proposition » → H13; « Bientôt » removed; the two founder-approved strings applied |
| `WhatsAppContactButton` | `size="md"` (h 44) | H13 frame `134:8027` |

## Decisions

1. **D-PR2-1 message helper**: the frame's « Les propositions courtes et précises reçoivent plus de réponses » is the same class of unsupported claim as the « 40 % » (D-H12-1) — replaced by « Minimum 20 caractères. Soyez court et précis. ». Say so if you want the frame's sentence back.
2. **D-PR2-2 skills pool is closed** on H12 (post skills ∪ my own, accent/case-insensitive); the server refuses the whole submit for a skill outside it rather than silently dropping it. The skills field is hidden when both lists are empty.
3. **D-PR2-3 links**: URL required, label optional (the recap falls back to the hostname), `http(s)` only, ≤ 500, ≤ 3, de-duplicated; a failed link in the DB (`invalid_links`) marks the first filled row.
4. **D-PR2-4 failures** (copy in `proposal.fail.*` is written to the specimen pattern, **needs approval**): `job_full`, `job_filled`, `job_deleted`, `job_expired`, `job_unavailable` (also `job_closed` / `job_not_found`), `cap_active`, `own_post`, `suspended` (both the capability hint and the hint-less « Ce compte est suspendu. »), `no_profile`, `not_allowed` (`not_self` / `not_freelancer` / `under_18` / `profile_hidden`), `technical`. Field-level: `invalid_links`, `too_many_skills`, plus the three CHECK-constraint names.
5. **D-PR2-5 the deferred stale-tab banner (L3, `visibilitychange`) is still deferred** (D-H12-6).
6. **D-PR2-6 H13 step 3** reads `response_count − 1` and is hidden at 0.
7. **D-PR2-7 a proposal is immutable** (UPDATE revoked by migration 59): there is no edit; « withdraw » is H11's (PR-3).

## Not done
- The specimens `378:10947` (« offre fermée pendant l'écriture » banner) — L3, above.
- The 20-character floor is the architect's number; the DB enforces it (`NOT VALID` CHECK, applied to new rows).

---

# PR-4 — consumer side (stacked on PR-2)

- **The post owner sees each proposal's terms** on `/mes-annonces/[id]`: price (TND, pinned LTR), délai, portfolio links (anchors with `target=_blank rel="noopener noreferrer nofollow"`), skills. Absent when empty — a message-only proposal renders exactly as before. `getAnnonceDetail` reads the M-C columns + `job_response_skills`; a failed responses read now **throws** (it used to render « no responses », which tells the owner nobody answered).
- **`/mes-annonces/nouvelle` skills field is the `SkillsPicker`** (custom mode): suggestions are the taxonomy pool of the *chosen* category; a typed text is added on its own, commas / semicolons separate several skills, a space never splits; a part that exists in the pool takes the pool's spelling. Server-side `validateJobPost` now de-duplicates accent/case-insensitively. This replaces the free-text `TagInput` that let « higsfild claude adobe » be saved as one tag.
- **The category is never chosen for the user** — the code already started on the placeholder (verified live: `value=""`) and still refuses a submit without one; the suggestions simply appear once the user picks it. Pinned by a test.
- Skills are stored in their **French label** (so a freelancer's profile skill and a post skill compare as one text whichever language the poster browses in); per-language labels for the suggestions are a follow-up.
- `getCategories()` now returns `slug` (the taxonomy key) and **throws** on error instead of returning `[]` (an empty category select made the form impossible to submit with no explanation).
