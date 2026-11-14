// Vercel « Ignored Build Step » — vercel.json `ignoreCommand`. Skips a deployment when the push changes nothing but
// documentation, to save Vercel Hobby build output (Functions Storage) on agents' docs-only pushes.
//
// THE EXIT CODE IS REVERSED (Vercel's rule): exit 0 = SKIP — the build is aborted and the deployment is CANCELED;
// exit 1 = BUILD. https://vercel.com/docs/project-configuration/project-settings#ignored-build-step
// Vercel runs this before `npm install`, in the Root Directory, on a shallow clone (depth 10): Node built-ins only.
//
// Skip only when every path that differs from the last SUCCESSFULLY deployed tree is documentation: anything under
// docs/, or a Markdown file at the repository root (README.md, AGENTS.md). Everything else builds — src, public, configs,
// package files, db, .github, .claude, scripts. Any doubt builds: no usable base, a git error, or no difference at all
// (a redeploy). Every run prints one « [ignore-build] » line in the build log saying what it compared and why.
//
// This file is the logic (imported by the tests); scripts/vercel-ignore-build.mjs is the command Vercel runs.

import { execFileSync } from 'node:child_process'

/** A path that cannot change what the app builds or serves (repository-relative, forward slashes). */
export function isDocsPath(path) {
  if (path.startsWith('docs/')) return true
  return !path.includes('/') && path.toLowerCase().endsWith('.md')
}

/** true = build. No difference at all (a redeploy of the same commit) builds too — never guess. */
export function shouldBuild(paths) {
  return paths.length === 0 || paths.some((path) => !isDocsPath(path))
}

function git(args, cwd) {
  // A hung git throws after 20 s; decide() turns any throw into BUILD.
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20_000 })
}

function parentsOf(rev, cwd) {
  return git(['rev-list', '--parents', '-n', '1', rev], cwd).trim().split(/\s+/).slice(1)
}

function commitExists(sha, cwd) {
  try {
    git(['cat-file', '-e', `${sha}^{commit}`], cwd)
    return true
  } catch {
    return false
  }
}

/**
 * The commit whose tree HEAD is compared with — { sha, how } — or null (no safe base: build).
 * 1. VERCEL_GIT_PREVIOUS_SHA, the last SUCCESSFUL deployment of this branch. Comparing trees (not HEAD^) judges
 *    everything since that deployment: a push with a src commit then a docs commit builds. When it is set but the
 *    shallow clone (depth 10) does not have it → null: everything since it is unknown — e.g. a code merge whose
 *    production build failed, followed by a docs-only merge — so it must build, never guess from a shorter range.
 * Only when there is NO previous deployment (a branch's first) are the fallbacks used:
 * 2. HEAD is a merge commit (a pull request merged into main): its first parent, i.e. everything the PR brings.
 * 3. Otherwise walk first parents back to the first merge commit — main only receives merge commits, so that is where
 *    the branch left main. A root commit or the edge of the shallow clone (a commit that shows no parent) → null.
 */
export function pickBase({ previousSha, cwd, maxWalk = 50 }) {
  if (previousSha) return commitExists(previousSha, cwd) ? { sha: previousSha, how: 'last successful deployment' } : null
  const headParents = parentsOf('HEAD', cwd)
  if (headParents.length > 1) return { sha: headParents[0], how: 'merge commit, first parent' }
  let rev = 'HEAD'
  for (let i = 0; i < maxWalk; i++) {
    const parents = parentsOf(rev, cwd)
    if (parents.length === 0) return null
    const parent = parents[0]
    if (parentsOf(parent, cwd).length > 1) return { sha: parent, how: 'branch point (first merge commit below HEAD)' }
    rev = parent
  }
  return null
}

/** Paths that differ between two trees. --no-renames lists BOTH sides of a rename (src/x → docs/x must build);
 *  -z with core.quotePath=false keeps accented names unquoted. */
export function changedPaths(base, cwd) {
  const out = git(['-c', 'core.quotePath=false', 'diff', '--name-only', '--no-renames', '-z', base, 'HEAD'], cwd)
  return out.split('\0').filter(Boolean)
}

const short = (sha) => sha.slice(0, 7)

/** The decision and its log line. Never throws: any failure builds. */
export function decide({ previousSha, cwd }) {
  try {
    const base = pickBase({ previousSha, cwd })
    if (!base) {
      const why = previousSha
        ? `the last successful deployment ${short(previousSha)} is not in the shallow clone`
        : 'no previous deployment on this branch, and no merge commit within reach'
      return { build: true, line: `BUILD — no base to compare with (${why})` }
    }
    const paths = changedPaths(base.sha, cwd)
    const from = `${short(base.sha)} (${base.how})`
    if (paths.length === 0) return { build: true, line: `BUILD — nothing differs from ${from}: a redeploy` }
    const firstApp = paths.find((path) => !isDocsPath(path))
    if (firstApp) return { build: true, line: `BUILD — ${paths.length} path(s) differ from ${from}; first non-docs path: ${firstApp}` }
    const sample = paths.slice(0, 3).join(', ') + (paths.length > 3 ? ', …' : '')
    return { build: false, line: `SKIP — the ${paths.length} path(s) that differ from ${from} are all docs: ${sample}` }
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
    return { build: true, line: `BUILD — the check failed (${message}); building to be safe` }
  }
}
