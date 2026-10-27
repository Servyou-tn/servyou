# 🔴 Uploads are capped at 4 MB by Vercel's payload limit — many phone photos cannot be uploaded

- **What:** an avatar is sent through a **server action**, and **Vercel caps a function's request
  payload at 4.5 MB** (`413 FUNCTION_PAYLOAD_TOO_LARGE`). That is a platform limit — no
  `bodySizeLimit` value raises it. So `MAX_INPUT_BYTES` is 4 MB, `bodySizeLimit` is `4.4mb`, and a
  photo above 4 MB is refused with an honest message.
- **Why this is a real product problem, not a tidy limit:** modern phone cameras routinely produce
  4–8 MB JPEGs, against a documented **70%+ mobile-first** market. A meaningful share of users will
  hit the refusal on their first attempt with an ordinary photo. The message is honest but the
  outcome is still "you cannot set a profile picture".
- **How it was found:** the authenticated gate, not the unit tests. Next's Server Actions default to
  a **1 MB** body, so the first real 3.7 MB upload died as `Body exceeded 1 MB limit` → 413 → a
  **500 through the error boundary**, i.e. a crash page. The unit tests never saw it because they
  call `normalizeAvatar` directly and never cross the action boundary. Worth remembering as the
  general lesson: a server action's payload ceiling is invisible to any test that does not go
  through HTTP.
- **The fix, and it is the same fix HEIC needs: downscale in the BROWSER before upload.** Resizing
  to ~1600px client-side puts any phone photo comfortably under 1 MB, which (a) removes the 4.5 MB
  cliff entirely, (b) makes the server action payload small and fast on mobile data, and (c) is the
  same code path that would convert HEIC. One change closes both entries.
  - Do NOT instead route uploads around the action to storage directly to dodge the cap: that
    trades the limit for a signed-upload flow and loses the server-side re-encode, which is the
    platform's actual content gate.
- **Trigger:** before real sellers onboard, or the first report of a failed photo upload. Pair it
  with the HEIC entry below — one client-side normalize step, both problems.
