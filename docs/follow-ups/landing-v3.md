# Landing v3 — follow-ups (`feat/landing-v3`, 2026-11-09)

## Social links in the footer are not linked yet
- **What:** the footer shows the official Facebook / Instagram / WhatsApp logos, but as plain images: ServYou's real account URLs were not provided.
- **Why deferred:** a link to a wrong or empty account is worse than no link.
- **Where:** `src/components/landing/LandingFooter.tsx` (`SOCIAL`).
- **Trigger:** the founder sends the three account URLs.

## contact@servyou.tn must exist before launch
- **What:** the FAQ and the footer use `mailto:contact@servyou.tn` (founder choice, Nov 9).
- **Why deferred:** the mailbox needs the servyou.tn domain.
- **Where:** `src/components/landing/Faq.tsx`, `LandingFooter.tsx`.
- **Trigger:** servyou.tn is bought / mail is set up.

## FAQ answers 2–8 are drafts
- **What:** answers 2–8 come from the Figma doc's draft answers; answers 3 (who delivers) and 7 (order statuses) must be checked against the real order flow.
- **Where:** `lp.faq.a2`…`lp.faq.a8` in `src/lib/i18n/fr.ts` and `ar.ts`.
- **Trigger:** founder review of the landing copy.

## Arabic copy is a draft (REVIEW_AR_TRANSLATION)
- **What:** every `lp.*` key in `ar.ts` is a first Arabic draft (category names reuse the DB `name_ar`).
- **Trigger:** a Tunisian speaker reviews the landing before launch.

## The dashboard screenshots are French in both languages
- **What:** the desktop Freelances / Boutiques screenshots are captures of the real app in French; the Arabic page reuses them (the phone mock-ups have Arabic versions).
- **Trigger:** when the Arabic dashboards are captured from the real app.

## Inter renders slightly wider in the browser than in Figma
- **What:** a few lines wrap one word earlier than in Figma (phone category titles, Mission paragraphs), so the phone page is ~190px taller than the frame (desktop: 2px).
- **Why deferred:** it is the self-hosted Inter file vs Figma's Inter 4 (optical sizes) — a global font change, out of scope here.
- **Trigger:** the next font/token pass.

## Lucide-style shirt / sparkles / house icons are not in the Figma DS yet
- **What:** the Mode / Beauté & Soins / Maison cards use lucide-react `Shirt`, `Sparkles`, `House`; in Figma they are drawn vectors flagged « add to DS ».
- **Trigger:** the next DS icon pass.
