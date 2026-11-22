import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

// The docs were reorganised by topic on 2026-11-22. An old page URL is redirected
// (public/_redirects) to the page its introduction moved to, and the browser keeps
// the #anchor — but that section may now live on another page. When the anchor is
// not on the page, look it up in public/moved-anchors.json (fetched only then) and
// go to where the section is now.
let moved: Promise<Record<string, string>> | undefined

async function followMovedAnchor(): Promise<void> {
  const { hash, pathname } = window.location
  if (hash.length < 2) return
  let id: string
  try {
    id = decodeURIComponent(hash.slice(1))
  } catch {
    return
  }
  if (document.getElementById(id)) return
  moved ??= fetch('/moved-anchors.json')
    .then((response) => (response.ok ? response.json() : {}))
    .catch(() => ({}))
  const page = pathname.replace(/\.html$/, '').replace(/\/index$/, '/')
  const target = (await moved)[`${page}#${id}`]
  if (target) window.location.replace(target)
}

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return
    router.onAfterPageLoad = () => {
      void followMovedAnchor()
    }
  },
}

export default theme
