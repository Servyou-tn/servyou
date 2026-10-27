# Shared-shell content column is wider than every frame in the file above 1440px (found 2026-09-04, `feat/h4-dashboard-freelancer`)

- **What:** `AppShellClient.tsx`'s content wrapper is `mx-auto w-full max-w-7xl` — a hardcoded
  1280px reading-width cap with no basis in any Foundations token. It sits on top of, and is
  unrelated to, the shell's own arithmetic (1440 frame − 240 sidebar − 32×2 page margin = 1136).
  At exactly 1440px viewport the two are indistinguishable (`max-w-7xl` never binds, since
  1136 < 1280), which is why every per-component measurement pass on H4 looked correct. At any
  viewport above 1440, `max-w-7xl` does bind and the content column stretches up to 1280px — 144px
  wider than any frame in the file.
- **Where it surfaces:** every page in all four workspaces, since `AppShellClient` is the shared
  frame — not H4-specific. Confirmed by figma-cli CDP: G4 (shop-owner dashboard, `475:21134`) and
  Marketplace services (`611:45637`) both independently land on the same 1136 via the identical
  sidebar+margin formula; no Screens-page frame in the file is ever drawn wider than 1440
  (Components-page specimen catalogs and the Foundations overview canvas do exceed it, but those
  aren't viewport frames). Foundations' "Dashboard / App-Screen Spacing Standard" (`239:7902`)
  locks the 32px page margin as a contract "for every app screen (freelancer + all 4 workspaces)"
  but defines no content-width/container token — 1136 is arithmetic, not an authored constant.
- **Not fixed here:** confirmed platform-wide, not H4-scoped, so it doesn't belong in the H4 PR
  per the one-PR-one-focus rule. H4 ships as-is.
- **Trigger:** its own PR touching `AppShellClient.tsx`. Fix is likely removing the `max-w-7xl` cap
  and letting the sidebar+margin arithmetic resolve the width naturally (reproduces 1136 at 1440
  without hardcoding it), rather than swapping in `max-w-[1136px]`. Needs a visual pass across all
  four workspaces at both 1440 and 1920.
