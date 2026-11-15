# Honesty fixes — stale mentions of the deleted /statistiques page (`fix/honesty-fixes`, 2026-11-15)

## Docs still describe /statistiques as a live (orphan) route

- **What:** `fix/honesty-fixes` deleted the « coming soon » page `/statistiques`. These docs still say it exists or list it:
  - `docs/follow-ups/marche-services-rebuild-follow-ups.md` (lines 43–44);
  - `docs/frontend-audit.md` (lines 20 and 113);
  - `docs/design-phase/servyou-design-system-reference-v1.md` (line 1029, the Analytics route);
  - `docs/discovery/journeys-2026-11-07.md` (G20, B11).
  `/admin/statistiques` is a different page and stays.
- **Why deferred:** these are shared docs (another file's follow-up entries, the design-system reference, a dated
  discovery). Editing them in a feature PR conflicts with other branches; found by this PR's review (low).
- **Where it lives:** the four files above.
- **Trigger:** the next docs tidy PR (the one that regenerates `docs/follow-ups/README.md`), or the next edit of any of
  those files.

## /aide still offers a « WhatsApp » button that leads to /contact, where WhatsApp is gone

- **What:** the help centre's contact panel (`src/components/aide/ContactPanel.tsx`) and its no-result state
  (`src/components/aide/AideCenter.tsx`) show a green WhatsApp CTA (`aide.contact.whatsapp` + `WhatsAppGlyph`) whose
  href is `SUPPORT_WHATSAPP_HREF = '/contact'`. Since this PR, /contact has no WhatsApp channel, so the button promises a
  channel that does not exist — the same honesty issue this PR fixes on /contact and the landing footer.
- **Why deferred:** not in the founder's list for this PR (one PR, one focus); it changes the Figma-built /aide panel, so
  the founder decides between removing the CTA and pointing it at e-mail / the contact form.
- **Where it lives:** the two files above and `src/components/aide/support.ts`.
- **Trigger:** the founder's answer (asked in this PR's report), or a confirmed public WhatsApp number.
