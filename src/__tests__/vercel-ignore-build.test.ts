import { afterAll, describe, expect, it, vi } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { changedPaths, decide, isDocsPath, pickBase, shouldBuild } from '../../scripts/vercel-ignore-build.mjs'

// The Vercel Ignored Build Step (vercel.json ignoreCommand → scripts/vercel-ignore-build.mjs). Exit 0 SKIPS a deployment,
// exit 1 BUILDS — so a wrong « skip » means app code never reaches a preview or production. Every case below runs the
// real git plumbing on a throwaway repository: what Vercel's shallow clone sees, rebuilt in a temp folder.

// Each case spawns a few dozen git processes — slow on Windows (~1–4 s a case), fast on CI's Linux.
vi.setConfig({ testTimeout: 30_000 })

const SCRIPT = resolve(__dirname, '../../scripts/vercel-ignore-build.mjs')
const ROOTS: string[] = []
const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], {
    cwd,
    env: ENV,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function repo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'ignore-build-'))
  ROOTS.push(dir)
  git(dir, 'init', '-q', '-b', 'main')
  return dir
}

/** Write files (path → content) and commit them; returns the new commit's SHA. */
function commit(dir: string, files: Record<string, string>, message = 'change'): string {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), content)
  }
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', message)
  return git(dir, 'rev-parse', 'HEAD')
}

/** main with an app, then a pull request merged with a merge commit — the shape of Servyou's main. Returns its tip. */
function mainWithMergedPr(dir: string): string {
  commit(dir, { 'src/app.ts': 'export const a = 1\n', 'README.md': '# app\n' }, 'initial')
  git(dir, 'checkout', '-q', '-b', 'feat/old')
  commit(dir, { 'src/old.ts': 'export const old = 1\n' }, 'old feature')
  git(dir, 'checkout', '-q', 'main')
  git(dir, 'merge', '-q', '--no-ff', 'feat/old', '-m', 'Merge pull request #1')
  return git(dir, 'rev-parse', 'HEAD')
}

afterAll(() => {
  for (const dir of ROOTS) rmSync(dir, { recursive: true, force: true })
})

describe('isDocsPath / shouldBuild — what may skip', () => {
  it.each(['docs/plan.md', 'docs/design/x/frame.png', 'README.md', 'AGENTS.md', 'notes.MD'])('%s is docs', (path) => {
    expect(isDocsPath(path)).toBe(true)
  })

  it.each([
    'src/app/page.tsx',
    'src/README.md', // Markdown, but not at the root
    'public/brand/logo.png',
    'package.json',
    'package-lock.json',
    'vercel.json',
    'next.config.ts',
    'db/migrations/0001.sql',
    '.github/workflows/ci.yml',
    '.claude/CLAUDE.md',
    'scripts/vercel-ignore-build.mjs',
    'docs', // a FILE named docs, not the folder
    'Docs/plan.md',
  ])('%s builds', (path) => {
    expect(isDocsPath(path)).toBe(false)
  })

  it('builds when nothing differs (a redeploy) or when any path is not docs; skips docs only', () => {
    expect(shouldBuild([])).toBe(true)
    expect(shouldBuild(['docs/a.md', 'README.md'])).toBe(false)
    expect(shouldBuild(['docs/a.md', 'src/x.ts'])).toBe(true)
  })
})

describe('decide — with the last successful deployment (VERCEL_GIT_PREVIOUS_SHA)', () => {
  it('docs-only since the last deployment → SKIP', () => {
    const dir = repo()
    const deployed = mainWithMergedPr(dir)
    commit(dir, { 'docs/follow-ups/x.md': 'note\n' })
    commit(dir, { 'README.md': '# app, updated\n' })
    const result = decide({ previousSha: deployed, cwd: dir })
    expect(result.build).toBe(false)
    expect(result.line).toMatch(/^SKIP — the 2 path\(s\) that differ from \w{7} \(last successful deployment\)/)
  })

  it('a src commit followed by a docs commit in ONE push → BUILD (HEAD^ alone would wrongly skip)', () => {
    const dir = repo()
    const deployed = mainWithMergedPr(dir)
    commit(dir, { 'src/app.ts': 'export const a = 2\n' })
    commit(dir, { 'docs/x.md': 'note\n' })
    const result = decide({ previousSha: deployed, cwd: dir })
    expect(result.build).toBe(true)
    expect(result.line).toContain('first non-docs path: src/app.ts')
    // the naive check this replaces
    expect(changedPaths(git(dir, 'rev-parse', 'HEAD^'), dir)).toEqual(['docs/x.md'])
  })

  it('moving a file from src/ to docs/ → BUILD (both sides of the rename are listed)', () => {
    const dir = repo()
    const deployed = mainWithMergedPr(dir)
    mkdirSync(join(dir, 'docs'), { recursive: true })
    renameSync(join(dir, 'src/old.ts'), join(dir, 'docs/old.ts'))
    git(dir, 'add', '-A')
    git(dir, 'commit', '-q', '-m', 'move')
    expect(changedPaths(deployed, dir).sort()).toEqual(['docs/old.ts', 'src/old.ts'])
    expect(decide({ previousSha: deployed, cwd: dir }).build).toBe(true)
  })

  it('an accented docs file name still counts as docs (no quoted path) → SKIP', () => {
    const dir = repo()
    const deployed = mainWithMergedPr(dir)
    commit(dir, { 'docs/décisions-été.md': 'note\n' })
    expect(changedPaths(deployed, dir)).toEqual(['docs/décisions-été.md'])
    expect(decide({ previousSha: deployed, cwd: dir }).build).toBe(false)
  })

  it('nothing differs from the deployed commit (a redeploy) → BUILD', () => {
    const dir = repo()
    const deployed = mainWithMergedPr(dir)
    expect(decide({ previousSha: deployed, cwd: dir }).line).toMatch(/^BUILD — nothing differs/)
  })
})

describe('decide — without a usable previous deployment', () => {
  it("a branch's first deployment is judged on ALL its commits since main (walk to the merge commit)", () => {
    const dir = repo()
    const branchPoint = mainWithMergedPr(dir)
    git(dir, 'checkout', '-q', '-b', 'feat/new')
    commit(dir, { 'src/new.ts': 'export const n = 1\n' })
    commit(dir, { 'docs/new.md': 'note\n' })
    expect(pickBase({ previousSha: '', cwd: dir })).toEqual({ sha: branchPoint, how: 'branch point (first merge commit below HEAD)' })
    expect(decide({ previousSha: '', cwd: dir }).build).toBe(true)
  })

  it("a docs-only branch's first deployment → SKIP", () => {
    const dir = repo()
    mainWithMergedPr(dir)
    git(dir, 'checkout', '-q', '-b', 'docs/plan')
    commit(dir, { 'docs/a.md': 'a\n' })
    commit(dir, { 'docs/b.md': 'b\n' })
    expect(decide({ previousSha: '', cwd: dir }).build).toBe(false)
  })

  it('production: a merge commit is judged on its first parent — app code merged → BUILD, docs-only PR → SKIP', () => {
    const dir = repo()
    mainWithMergedPr(dir)
    git(dir, 'checkout', '-q', '-b', 'feat/app')
    commit(dir, { 'src/app.ts': 'export const a = 3\n' })
    commit(dir, { 'docs/app.md': 'note\n' })
    git(dir, 'checkout', '-q', 'main')
    const before = git(dir, 'rev-parse', 'HEAD')
    git(dir, 'merge', '-q', '--no-ff', 'feat/app', '-m', 'Merge pull request #2')
    expect(pickBase({ previousSha: '', cwd: dir })).toEqual({ sha: before, how: 'merge commit, first parent' })
    expect(decide({ previousSha: '', cwd: dir }).build).toBe(true)

    git(dir, 'checkout', '-q', '-b', 'docs/only')
    commit(dir, { 'docs/only.md': 'note\n' })
    git(dir, 'checkout', '-q', 'main')
    git(dir, 'merge', '-q', '--no-ff', 'docs/only', '-m', 'Merge pull request #3')
    expect(decide({ previousSha: '', cwd: dir }).build).toBe(false)
  })

  it('production with the previous deployment present: everything since it counts', () => {
    const dir = repo()
    const deployed = mainWithMergedPr(dir)
    git(dir, 'checkout', '-q', '-b', 'feat/app')
    commit(dir, { 'package.json': '{}\n' })
    git(dir, 'checkout', '-q', 'main')
    git(dir, 'merge', '-q', '--no-ff', 'feat/app', '-m', 'Merge pull request #4')
    expect(decide({ previousSha: deployed, cwd: dir }).line).toContain('first non-docs path: package.json')
  })

  it('a previous SHA missing from the clone falls back to the merge-commit walk', () => {
    const dir = repo()
    const branchPoint = mainWithMergedPr(dir)
    git(dir, 'checkout', '-q', '-b', 'docs/x')
    commit(dir, { 'docs/x.md': 'x\n' })
    const gone = 'f'.repeat(40)
    expect(pickBase({ previousSha: gone, cwd: dir })).toEqual({ sha: branchPoint, how: 'branch point (first merge commit below HEAD)' })
    expect(decide({ previousSha: gone, cwd: dir }).build).toBe(false)
  })

  it('no merge commit within reach (linear history, or the edge of a shallow clone) → BUILD', () => {
    const dir = repo()
    commit(dir, { 'src/a.ts': '1\n' })
    commit(dir, { 'docs/a.md': 'a\n' })
    expect(pickBase({ previousSha: '', cwd: dir })).toBeNull()
    expect(decide({ previousSha: '', cwd: dir }).line).toMatch(/^BUILD — no base to compare with \(no previous deployment/)

    // Vercel clones with --depth=10: the oldest commit of a shallow clone shows no parent — never a base.
    const shallow = mkdtempSync(join(tmpdir(), 'ignore-build-shallow-'))
    ROOTS.push(shallow)
    rmSync(shallow, { recursive: true, force: true })
    const source = repo()
    mainWithMergedPr(source)
    git(source, 'checkout', '-q', '-b', 'feat/long')
    for (let i = 0; i < 4; i++) commit(source, { [`docs/${i}.md`]: `${i}\n` })
    git(tmpdir(), 'clone', '-q', '--depth=2', '--branch', 'feat/long', pathToFileURL(source).href, shallow)
    expect(git(shallow, 'rev-parse', '--is-shallow-repository')).toBe('true')
    expect(pickBase({ previousSha: '', cwd: shallow })).toBeNull()
    expect(decide({ previousSha: '', cwd: shallow }).build).toBe(true)
  })

  it('any failure builds (not a git repository)', () => {
    const notRepo = mkdtempSync(join(tmpdir(), 'ignore-build-none-'))
    ROOTS.push(notRepo)
    const result = decide({ previousSha: '', cwd: notRepo })
    expect(result.build).toBe(true)
    expect(result.line).toMatch(/^BUILD — the check failed/)
  })
})

describe('the command Vercel runs (node scripts/vercel-ignore-build.mjs)', () => {
  const run = (cwd: string, previousSha: string) =>
    spawnSync(process.execPath, [SCRIPT], { cwd, env: { ...ENV, VERCEL_GIT_PREVIOUS_SHA: previousSha }, encoding: 'utf8' })

  it('exits 0 to SKIP a docs-only push and 1 to BUILD anything else, with one log line each', () => {
    const dir = repo()
    const deployed = mainWithMergedPr(dir)
    commit(dir, { 'docs/x.md': 'x\n' })
    const skip = run(dir, deployed)
    expect(skip.status).toBe(0)
    expect(skip.stdout).toMatch(/^\[ignore-build\] SKIP — /)

    commit(dir, { 'src/app.ts': 'export const a = 9\n' })
    const build = run(dir, deployed)
    expect(build.status).toBe(1)
    expect(build.stdout).toMatch(/^\[ignore-build\] BUILD — .*first non-docs path: src\/app\.ts/)
  })
})
