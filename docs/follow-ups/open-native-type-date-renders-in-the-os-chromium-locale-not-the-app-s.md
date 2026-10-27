# Native `type="date"` renders in the OS/Chromium locale, not the app's `lang` — mm/dd/yyyy on an AR page
- **What:** the browser's built-in date picker and its placeholder format follow the host OS/browser
  locale, which `lang`/`dir` (the app's own FR/AR switch) has no control over. On a Chromium browser
  set to an English OS locale, `/mes-annonces/nouvelle`'s Deadline field renders `mm/dd/yyyy` even
  when the page itself is rendered in Arabic (`dir="rtl"`, every surrounding label in Arabic).
  `SignupForm.tsx:294` has the identical `type="date"` field and the identical bug — confirmed by
  grep, not assumed: it is the only other `type="date"` input in `src`, so this is not a novel
  defect, it is the second known instance of one.
- **Why not fixed here:** the real fix is a DS `DatePicker` (explicitly out of scope for PR-D, and
  presumably for the signup form's own PR too) — restyling the native input, which PR-D did, does
  not touch the picker's locale behavior, which is the browser's, not CSS's, to control.
- **Trigger:** the DS pass that builds a real `DatePicker` primitive — fix both call sites
  (`SignupForm.tsx` and `AnnonceForm.tsx`) together, since they now share the exact same defect.
