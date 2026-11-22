# Introduction

This guide covers server-driven pages with photon:

- Installation
- Setup

Photon is Ream's server-side rendering (SSR) engine with client-side hydration. It supports React, Vue, and Svelte out of the box, with Vite-powered HMR in development and optimized builds for production.

## Installation

```bash
pnpm add @c9up/photon
```

## Setup

Register the Photon middleware in your application with a `PhotonConfig`:

```typescript
import { PhotonMiddleware } from '@c9up/photon'

const photon = new PhotonMiddleware({
  framework: 'react',                    // 'react' | 'vue' | 'svelte'
  entryClient: 'resources/app.tsx',      // Client hydration entry
  ssr: {
    enabled: true,                       // Off by default
    entrypoint: 'resources/ssr.tsx',     // SSR render entry
  },
  buildDir: 'public/build',              // Where the client build is written
  assetsUrl: '/build',                   // The URL the static server gives it
  ssrBuildDir: 'build/ssr',              // The SSR bundle — never under public/
  viteDevUrl: 'http://localhost:5173',   // Vite dev server URL (dev only)
})

// Register the middleware via .middleware()
router.use([photon.middleware()])
```

`buildDir` is resolved against the **application root**, which the provider
takes from `app.makePath()` — not against the directory the process started in.
An application launched by systemd, or from the root of a monorepo, therefore
finds its build where it actually is. Set `appRoot` explicitly when a deployment
lays the build out somewhere else; it wins over what the host reports.

`buildDir` is a path on disk and `assetsUrl` the URL it is served at: the static
server strips `public/`, so `public/build/app.js` is `/build/app.js`. Set both
when the build moves, or point `assetsUrl` at a CDN.

The SSR bundle is server code and goes in `ssrBuildDir`, which boot refuses
inside `buildDir` or `public/` — anywhere the static server would hand it out.

## Next Steps
- [Routing](/en/guides/basics/routing) — Define routes that render Photon pages
- [Middleware](/en/guides/basics/middleware) — Add authentication before rendering
- [Warden (Auth)](/en/guides/auth/introduction) — Protect pages with guards
