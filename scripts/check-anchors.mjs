#!/usr/bin/env node
// Every internal link of the built site must reach a page, and its #anchor an id on
// that page. VitePress fails the build on a dead page link but never checks anchors,
// so a moved or renamed heading breaks links silently; this catches it.
//
//   node scripts/check-anchors.mjs [dist directory]   (default .vitepress/dist)
//
// Exit code 1 and one line per broken link otherwise. No dependency.

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, posix } from 'node:path'

const dist = process.argv[2] ?? '.vitepress/dist'

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return htmlFiles(path)
    return name.endsWith('.html') ? [path] : []
  })
}

const pages = new Map() // "/en/guides/basics/routing.html" -> { ids, html }
for (const file of htmlFiles(dist)) {
  const html = readFileSync(file, 'utf8')
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
  pages.set('/' + relative(dist, file).split('\\').join('/'), { ids, html })
}

/** The page file a site path is served from, or undefined. */
function resolvePage(path) {
  const candidates = path.endsWith('/')
    ? [`${path}index.html`]
    : path.endsWith('.html')
      ? [path]
      : [`${path}.html`, `${path}/index.html`]
  return candidates.find((c) => pages.has(c))
}

const broken = []
for (const [page, { html }] of pages) {
  // Only the document's own content and navigation: <a href="..."> anywhere.
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    const href = m[1].replaceAll('&amp;', '&')
    if (/^(https?:|mailto:|tel:|javascript:|data:)/.test(href) || href === '#') continue
    const [rawPath, rawFrag] = href.split('#')
    const path = rawPath === '' ? page : rawPath.startsWith('/') ? rawPath : posix.join(posix.dirname(page), rawPath)
    if (/\.(svg|png|jpe?g|gif|webp|ico|pdf|txt|xml|json|zip)$/i.test(path)) {
      if (!existsSync(join(dist, path))) broken.push(`${page}: ${href} (no such file)`)
      continue
    }
    const target = resolvePage(path)
    if (!target) {
      broken.push(`${page}: ${href} (no such page)`)
      continue
    }
    if (rawFrag === undefined || rawFrag === '') continue
    let frag
    try {
      frag = decodeURIComponent(rawFrag)
    } catch {
      frag = rawFrag
    }
    if (!pages.get(target).ids.has(frag)) broken.push(`${page}: ${href} (no #${frag} on ${target})`)
  }
}

if (broken.length > 0) {
  console.error(`${broken.length} broken link(s):`)
  for (const line of [...new Set(broken)].sort()) console.error(`  ${line}`)
  process.exit(1)
}
console.log(`${pages.size} pages, every internal link and anchor resolves.`)
