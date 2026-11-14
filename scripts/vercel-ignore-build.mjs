// The command Vercel runs as the Ignored Build Step (vercel.json `ignoreCommand`). The logic is in
// ./vercel-ignore-build-lib.mjs (tested by src/__tests__/vercel-ignore-build.test.ts).
//
// REVERSED EXIT CODES (Vercel's rule): exit 0 = SKIP the deployment, exit 1 = BUILD.
// https://vercel.com/docs/project-configuration/project-settings#ignored-build-step
// This file always runs and always exits explicitly. Falling off the end exits 0 — a SKIP — so there is deliberately
// no « is this the main module? » guard here: a guard that misfires would silently cancel every deployment. If the
// import below fails, Node exits 1 — a BUILD.

import { decide } from './vercel-ignore-build-lib.mjs'

const { build, line } = decide({ previousSha: process.env.VERCEL_GIT_PREVIOUS_SHA || '', cwd: process.cwd() })
console.log(`[ignore-build] ${line}`)
process.exit(build ? 1 : 0)
