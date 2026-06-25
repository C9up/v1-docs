import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Ream',
  description: 'Rust-powered Node.js framework',

  locales: {
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/introduction' },
          { text: 'Modules', link: '/en/modules/' },
          { text: 'CLI', link: '/en/cli/ream' },
          { text: 'Errors', link: '/en/errors/' },
        ],
        sidebar: {
          '/en/guide/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Introduction', link: '/en/guide/introduction' },
                { text: 'Installation', link: '/en/guide/installation' },
                { text: 'Quick Start', link: '/en/guide/quick-start' },
                { text: 'Folder Structure', link: '/en/guide/folder-structure' },
              ],
            },
            {
              text: 'Concepts',
              items: [
                { text: 'Application Lifecycle', link: '/en/guide/lifecycle' },
                { text: 'IoC Container', link: '/en/guide/container' },
                { text: 'Providers', link: '/en/guide/providers' },
                { text: 'Routing', link: '/en/guide/routing' },
                { text: 'Middleware', link: '/en/guide/middleware' },
                { text: 'Configuration', link: '/en/guide/configuration' },
                { text: 'Migration Guide', link: '/en/guide/migration' },
                { text: 'Plugin System', link: '/en/guide/plugin-system' },
                { text: 'Publishing & CI', link: '/en/guide/publishing' },
              ],
            },
          ],
          '/en/modules/': [
            {
              text: 'Modules',
              items: [
                { text: 'Overview', link: '/en/modules/' },
                { text: 'Archive (Storage)', link: '/en/modules/archive' },
                { text: 'Atlas (ORM)', link: '/en/atlas/' },
                { text: 'Aurora (Reactive UI)', link: '/en/modules/aurora' },
                { text: 'Bay (Queue/Jobs)', link: '/en/modules/bay' },
                { text: 'Blackhole (Security)', link: '/en/modules/blackhole' },
                { text: 'Chronos (DateTime + RRULE)', link: '/en/modules/chronos' },
                { text: 'Comet (JSON-RPC)', link: '/en/modules/comet' },
                { text: 'Echo (Cache)', link: '/en/modules/echo' },
                { text: 'Helix (Testing)', link: '/en/modules/helix' },
                { text: 'Inker (Templates) - Missing', link: '/en/modules/inker' },
                { text: 'Nova (Notifications)', link: '/en/modules/nova' },
                { text: 'Photon (Frontend)', link: '/en/modules/photon' },
                { text: 'Atom (Decimal)', link: '/en/modules/atom' },
                { text: 'Event Bus (ream core)', link: '/en/ream/events' },
                { text: 'Ream (Core)', link: '/en/ream/' },
                { text: 'Relay (Realtime)', link: '/en/modules/relay' },
                { text: 'Rosetta (I18n)', link: '/en/modules/rosetta' },
                { text: 'Rune (Validation)', link: '/en/modules/rune' },
                { text: 'Rover (Mail)', link: '/en/modules/rover' },
                { text: 'Sigil (Password Hashing)', link: '/en/modules/sigil' },
                { text: 'Spectrum (Logging)', link: '/en/modules/spectrum' },
                { text: 'Station (Admin) - Missing', link: '/en/modules/station' },
                { text: 'Tailwind CSS', link: '/en/modules/tailwind' },
                { text: 'Warden (Auth)', link: '/en/modules/warden' },
              ],
            },
          ],
          '/en/ream/': [
            {
              text: 'Ream Core',
              items: [
                { text: 'Overview', link: '/en/ream/' },
                { text: 'Ignitor and Bootstrap', link: '/en/ream/ignitor' },
                { text: 'Application Lifecycle', link: '/en/ream/lifecycle' },
                { text: 'IoC Container', link: '/en/ream/ioc-container' },
                { text: 'HTTP Kernel and Routing', link: '/en/ream/http-kernel' },
                { text: 'API Layer (JSON-RPC, GraphQL, OpenAPI)', link: '/en/ream/api-layer' },
                { text: 'Event Bus', link: '/en/ream/events' },
                { text: 'Errors and Exception Handling', link: '/en/ream/errors' },
                { text: 'Security and Operations', link: '/en/ream/security-ops' },
              ],
            },
          ],
          '/en/atlas/': [
            {
              text: 'Atlas',
              items: [
                { text: 'Overview', link: '/en/atlas/' },
                { text: 'Getting Started', link: '/en/atlas/getting-started' },
                { text: 'Relations', link: '/en/atlas/relations' },
                { text: 'Query Builder', link: '/en/atlas/query-builder' },
                { text: 'Advanced ModelQuery', link: '/en/atlas/model-query-advanced' },
                { text: 'Repository Patterns', link: '/en/atlas/repository-patterns' },
                { text: 'Migrations', link: '/en/atlas/migrations' },
                { text: 'Domain Events', link: '/en/atlas/domain-events' },
                { text: 'SQL Security', link: '/en/atlas/security' },
                { text: 'Performance', link: '/en/atlas/performance' },
                { text: 'API Reference', link: '/en/atlas/api-reference' },
                { text: 'Recipes', link: '/en/atlas/recipes' },
                { text: 'Troubleshooting', link: '/en/atlas/troubleshooting' },
              ],
            },
          ],
          '/en/cli/': [
            {
              text: 'CLI',
              items: [
                { text: 'ream CLI', link: '/en/cli/ream' },
                
              ],
            },
          ],
        },
      },
    },
    fr: {
      label: 'Français',
      lang: 'fr',
      link: '/fr/',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/fr/guide/introduction' },
          { text: 'Modules', link: '/fr/modules/' },
          { text: 'CLI', link: '/fr/cli/ream' },
          { text: 'Erreurs', link: '/fr/errors/' },
        ],
        sidebar: {
          '/fr/guide/': [
            {
              text: 'Démarrage',
              items: [
                { text: 'Introduction', link: '/fr/guide/introduction' },
                { text: 'Installation', link: '/fr/guide/installation' },
                { text: 'Démarrage rapide', link: '/fr/guide/quick-start' },
                { text: 'Structure du projet', link: '/fr/guide/folder-structure' },
              ],
            },
            {
              text: 'Concepts',
              items: [
                { text: 'Cycle de vie', link: '/fr/guide/lifecycle' },
                { text: 'Conteneur IoC', link: '/fr/guide/container' },
                { text: 'Providers', link: '/fr/guide/providers' },
                { text: 'Routing', link: '/fr/guide/routing' },
                { text: 'Middleware', link: '/fr/guide/middleware' },
                { text: 'Configuration', link: '/fr/guide/configuration' },
                { text: 'Guide de migration', link: '/fr/guide/migration' },
                { text: 'Système de plugins', link: '/fr/guide/plugin-system' },
                { text: 'Publication & CI', link: '/fr/guide/publishing' },
              ],
            },
          ],
          '/fr/modules/': [
            {
              text: 'Modules',
              items: [
                { text: 'Overview', link: '/fr/modules/' },
                { text: 'Archive (Storage)', link: '/fr/modules/archive' },
                { text: 'Atlas (ORM)', link: '/fr/atlas/' },
                { text: 'Aurora (UI réactif)', link: '/fr/modules/aurora' },
                { text: 'Bay (Queue/Jobs)', link: '/fr/modules/bay' },
                { text: 'Blackhole (Sécurité)', link: '/fr/modules/blackhole' },
                { text: 'Chronos (DateTime + RRULE)', link: '/fr/modules/chronos' },
                { text: 'Comet (JSON-RPC)', link: '/fr/modules/comet' },
                { text: 'Echo (Cache)', link: '/fr/modules/echo' },
                { text: 'Helix (Testing)', link: '/fr/modules/helix' },
                { text: 'Inker (Templates) - Manquant', link: '/fr/modules/inker' },
                { text: 'Nova (Notifications)', link: '/fr/modules/nova' },
                { text: 'Photon (Frontend)', link: '/fr/modules/photon' },
                { text: 'Atom (Decimal)', link: '/fr/modules/atom' },
                { text: 'Event bus (core ream)', link: '/fr/ream/events' },
                { text: 'Ream (Core)', link: '/fr/ream/' },
                { text: 'Relay (Realtime)', link: '/fr/modules/relay' },
                { text: 'Rosetta (I18n)', link: '/fr/modules/rosetta' },
                { text: 'Rune (Validation)', link: '/fr/modules/rune' },
                { text: 'Rover (Mail)', link: '/fr/modules/rover' },
                { text: 'Sigil (Hachage)', link: '/fr/modules/sigil' },
                { text: 'Spectrum (Logging)', link: '/fr/modules/spectrum' },
                { text: 'Station (Admin) - Manquant', link: '/fr/modules/station' },
                { text: 'Tailwind CSS', link: '/fr/modules/tailwind' },
                { text: 'Warden (Auth)', link: '/fr/modules/warden' },
              ],
            },
          ],
          '/fr/ream/': [
            {
              text: 'Ream Core',
              items: [
                { text: 'Vue d ensemble', link: '/fr/ream/' },
                { text: 'Ignitor et Bootstrap', link: '/fr/ream/ignitor' },
                { text: 'Lifecycle applicatif', link: '/fr/ream/lifecycle' },
                { text: 'Container IoC', link: '/fr/ream/ioc-container' },
                { text: 'HTTP kernel et routing', link: '/fr/ream/http-kernel' },
                { text: 'Couche API (JSON-RPC, GraphQL, OpenAPI)', link: '/fr/ream/api-layer' },
                { text: 'Event bus', link: '/fr/ream/events' },
                { text: 'Erreurs et exception handling', link: '/fr/ream/errors' },
                { text: 'Securite et operations', link: '/fr/ream/security-ops' },
              ],
            },
          ],
          '/fr/atlas/': [
            {
              text: 'Atlas',
              items: [
                { text: 'Vue d ensemble', link: '/fr/atlas/' },
                { text: 'Démarrage rapide', link: '/fr/atlas/getting-started' },
                { text: 'Relations', link: '/fr/atlas/relations' },
                { text: 'Query Builder', link: '/fr/atlas/query-builder' },
                { text: 'ModelQuery avancé', link: '/fr/atlas/model-query-advanced' },
                { text: 'Patterns Repository', link: '/fr/atlas/repository-patterns' },
                { text: 'Migrations', link: '/fr/atlas/migrations' },
                { text: 'Domain Events', link: '/fr/atlas/domain-events' },
                { text: 'Sécurité SQL', link: '/fr/atlas/security' },
                { text: 'Performance', link: '/fr/atlas/performance' },
                { text: 'API Reference', link: '/fr/atlas/api-reference' },
                { text: 'Recipes', link: '/fr/atlas/recipes' },
                { text: 'Troubleshooting', link: '/fr/atlas/troubleshooting' },
              ],
            },
          ],
          '/fr/cli/': [
            {
              text: 'CLI',
              items: [
                { text: 'ream CLI', link: '/fr/cli/ream' },
                
              ],
            },
          ],
        },
      },
    },
  },

  themeConfig: {
    logo: '/logo.svg',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/C9up/ream-dev' },
    ],
  },
})
