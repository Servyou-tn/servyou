# B5 Paramètres › Notifications (`feat/parametres-notifications`, 2026-10-29)

## « Missions correspondant à mes compétences » has no column
**What:** the freelancer frame (424:17442) draws this toggle (default off); migration 97 has no column for it, so it is not rendered.
**Why deferred:** a toggle that cannot save would lie; the column is a DB decision.
**Where it lives:** `src/lib/notifications/prefs.ts` (`rowsForRole`), `db/migrations/20261028221948_notification_preferences.sql`.
**Trigger:** the DB agent adds `email_missions` (default false); then it is one row + two i18n keys.

## Nothing sends these e-mails yet
**What:** preferences are stored; no sender reads them. The copy is the frame's (« Recevez un e-mail quand… »).
**Trigger:** the first e-mail sender must read `notification_preferences` (no row = column defaults) and honour it; revisit the copy if sending slips past launch.

## 375 mobile frame not measured
**What:** « Paramètres (375 mobile) » exists in Figma but its node id was unavailable (`fig.mjs eval` is in safe mode, cannot search by name). Mobile follows the shell's existing 375 layout.
**Trigger:** founder supplies the node id → one `fig.mjs dump`, measure, adjust (rows already stack; the footer wraps).

## Toggle descriptions are not announced
**What:** `SettingRow`'s description `<p>` is not linked to its `role="switch"` (`aria-describedby`); `Toggle` only wires its own `helper`.
**Where it lives:** `src/components/ui/setting-row.tsx`, `src/components/ui/toggle.tsx` (shared by every Paramètres tab and G6).
**Trigger:** a small shared-primitive PR (add an `aria-describedby` prop, pass the description id).

## « Bientôt disponible » is French in Arabic
**What:** `marche.sidebar.coming_soon` has the French text in `ar.ts` — every « coming soon » badge (sidebar, Confidentialité, this tab) reads French in AR.
**Where it lives:** `src/lib/i18n/ar.ts` (one value), consumed in several places.
**Trigger:** the AR review pass (vocabulary lock decides the wording).
