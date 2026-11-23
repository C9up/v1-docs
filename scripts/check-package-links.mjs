#!/usr/bin/env node
// The packages point their users at this site: an error's `docsUrl`, a warning's
// "See https://r-eam.com/…", a README. Two things must hold in the built site:
//
// 1. every https://r-eam.com/… URL written in a package's sources reaches a page,
//    and its #anchor an id on that page;
// 2. every error code a package raises (`E_…` in a string, comments left out)
//    has its row in the error index, in each language, under the anchor
//    `errorDocsUrl()` builds: the code in lower case with `-` for `_`.
//
//   node scripts/check-package-links.mjs [dist directory] [packages directory]
//   (defaults: .vitepress/dist and ../packages, i.e. run from ream-dev/docs)
//
// Exit code 1 and one line per problem otherwise. No dependency.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const dist = process.argv[2] ?? '.vitepress/dist'
const packages = process.argv[3] ?? '../packages'
const SITE = 'https://r-eam.com'
const LANGS = ['en', 'fr']

for (const dir of [dist, packages]) {
  if (!existsSync(dir)) {
    console.error(`${dir} does not exist: build the site, and run this from ream-dev/docs.`)
    process.exit(1)
  }
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'target', 'coverage', 'tests', 'test', '.git', '.workstream', 'fixtures'])

/** The files a package ships or builds from: sources, crates, scripts, README, registry. */
function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) return []
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|mts|rs|md|json|stub)$/.test(name) && !name.endsWith('.d.ts') && name !== 'package-lock.json'
      ? [path]
      : []
  })
}

function idsOf(file) {
  const html = readFileSync(file, 'utf8')
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
}

/** The built file a site path is served from, or undefined. */
function resolve(path) {
  const candidates = path.endsWith('/')
    ? [`${path}index.html`]
    : /\.[a-z]+$/.test(path)
      ? [path]
      : [`${path}.html`, `${path}/index.html`]
  return candidates.map((c) => join(dist, c)).find((c) => existsSync(c))
}

const problems = []
const codes = new Map() // code -> first file that raises it

for (const pkg of readdirSync(packages)) {
  const root = join(packages, pkg)
  if (!statSync(root).isDirectory()) continue
  for (const file of sourceFiles(root)) {
    const text = readFileSync(file, 'utf8')
    const where = relative(packages, file)

    for (const m of text.matchAll(/https:\/\/r-eam\.com(\/[^\s"'`)<>\]]*)?/g)) {
      const url = m[0].replace(/[.,;:]+$/, '')
      if (url.includes('${')) continue // built at run time, e.g. errorDocsUrl(code): checked by (2)
      const [path, fragment] = (url.slice(SITE.length) || '/').split('#')
      const target = resolve(path)
      if (!target) problems.push(`${where}: ${url} (no such page)`)
      else if (fragment && !idsOf(target).has(fragment)) problems.push(`${where}: ${url} (no #${fragment} on the page)`)
    }

    if (!/\.(ts|mts|rs)$/.test(file)) continue
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    for (const m of code.matchAll(/["'`](E_[A-Z][A-Z0-9_]*[A-Z0-9])["'`]/g)) {
      if (!codes.has(m[1])) codes.set(m[1], where)
    }
  }
}

for (const lang of LANGS) {
  const page = resolve(`/${lang}/reference/errors`)
  if (!page) {
    problems.push(`/${lang}/reference/errors is missing from the build`)
    continue
  }
  const ids = idsOf(page)
  for (const [code, where] of codes) {
    const anchor = code.toLowerCase().replaceAll('_', '-')
    if (!ids.has(anchor)) problems.push(`${where}: ${code} has no #${anchor} on /${lang}/reference/errors`)
  }
}

if (problems.length > 0) {
  console.error(`${problems.length} problem(s):`)
  for (const line of [...new Set(problems)].sort()) console.error(`  ${line}`)
  process.exit(1)
}
console.log(`${codes.size} error codes and every r-eam.com link of the packages resolve.`)
