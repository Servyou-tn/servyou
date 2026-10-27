# S-3 — uploads through the service role (`fix/storage-uploads-service-role`, 2026-10-26)

## LOW — `scripts/rls-smoke.mjs` Phase 5c assumes client uploads

- After the client INSERT storage policies are dropped, its S1 / S1b / S4 checks (« shop owner CAN upload under
  their OWN shop path ») fail, and S2 / S3 (foreign-shop / bucket-root refusals) pass vacuously because no
  INSERT policy exists at all. The script is never run (it reaps every test-domain user); fix or delete Phase 5c
  if it is ever revived.

## LOW — `server-only` markers

- `src/lib/supabase/admin.ts` and `src/lib/images/upload-guard.ts` are imported only from `'use server'`
  modules today, but neither carries `import 'server-only'`, so a future client-component import would not fail
  the build. Cheap hardening: add the marker to both.
