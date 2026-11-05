# H12 Proposition + H13 Proposition envoyée at 375 — diff, kept, questions

Exports in this folder: `m375-h12-proposition`, `m375-h13-envoyee`.

## Built (below lg / sm only)

| Screen | Change | File |
|---|---|---|
| H12 | Content + columns gap 20 · right column gap 16 · form panel pad 24/16 | `missions/[id]/proposer/page.tsx`, `_components/ProposalForm.tsx` |
| H12 | Link inputs full width while there is a single row: its 44 px alignment spacer takes no room below sm; with two or more rows the spacer returns so every row ends at the same edge (review fix) | `_components/LinksField.tsx` |
| H13 | « Ce que vous avez envoyé » and « Et maintenant ? » panels pad 24/16 | `proposition-envoyee/_components/SentRecap.tsx`, `page.tsx` |

## Kept as built (standing defaults)

Texts (« Envoyer ma proposition » vs the frame's « Envoyer ma réponse », the helpers, the price placeholder « 0 », « Karim
la verra dans ses annonces ») · the URL field's globe icon · the shared `MissionFacts` / `ClientCard` padding · H13's recap
category chip (frame: an icon beside the title) · H13's next steps as built (the client contacts the freelancer).

## Questions

1. H13: the frame ends with a green « Contacter Karim via WhatsApp » button (and « Vous pouvez le contacter directement »).
   Today the freelancer does not get the client's number after proposing — the client contacts them. Add it?

Controls: tsc · eslint · desktop sentinel 1440 FR + AR (max-* only; same frozen fixture; only the known top-bar noise band
differs) · 375 FR side by side · AR spot check (H12 form).
