import { defineConfig, type HeadConfig } from 'vitepress'
import { nav_en, nav_fr, sidebar_en, sidebar_fr } from './sidebar'

// Nebula's components by layer, as the registry files them. Each one has a
// page at /<lang>/nebula/components/<name>; the title is the export's name.
const nebulaLayers = {
  atoms: ['AccessibleIcon', 'AspectRatio', 'Avatar', 'Badge', 'Button', 'Checkbox', 'Image', 'Input', 'Kbd', 'Label', 'Marker', 'NativeSelect', 'Progress', 'ScrollArea', 'Separator', 'Skeleton', 'Slider', 'Spinner', 'Switch', 'Textarea', 'Toggle', 'VisuallyHidden'],
  molecules: ['Accordion', 'Alert', 'Attachment', 'Breadcrumb', 'Bubble', 'ButtonGroup', 'Card', 'Collapsible', 'Empty', 'Field', 'InputGroup', 'InputOTP', 'Item', 'Message', 'Pagination', 'Picture', 'PieceMap', 'RadioGroup', 'Resizable', 'Table', 'Tabs', 'ToggleGroup', 'Toolbar', 'Typography'],
  organisms: ['AlertDialog', 'Calendar', 'Carousel', 'Chart', 'Combobox', 'Command', 'CommandDialog', 'ContextMenu', 'DataTable', 'DatePicker', 'DateRangePicker', 'Dialog', 'Drawer', 'DropdownMenu', 'Form', 'HoverCard', 'Menubar', 'MessageScroller', 'NavigationMenu', 'Popover', 'Questionnaire', 'Select', 'Sheet', 'Sidebar', 'Sonner', 'Toaster', 'Tooltip'],
  templates: ['AppShell', 'AuthLayout', 'SettingsLayout'],
} as const

/** `InputOTP` → `input-otp`, `DataTable` → `data-table`: the registry's names. */
const registryName = (title: string): string =>
  title.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

function nebulaSidebar(lang: 'en' | 'fr') {
  const t = lang === 'en'
    ? { guide: 'Nebula', overview: 'Overview', installation: 'Installation', source: 'Owning the source', composition: 'Composition and reactivity', languages: 'Languages and direction', scope: 'Narrower than shadcn', atoms: 'Atoms', molecules: 'Molecules', organisms: 'Organisms', templates: 'Templates' }
    : { guide: 'Nebula', overview: "Vue d'ensemble", installation: 'Installation', source: 'Posséder la source', composition: 'Composition et réactivité', languages: 'Langues et sens de lecture', scope: 'Plus étroit que shadcn', atoms: 'Atomes', molecules: 'Molécules', organisms: 'Organismes', templates: 'Templates' }
  const base = `/${lang}/nebula`
  return [
    {
      text: t.guide,
      items: [
        { text: t.overview, link: `${base}/` },
        { text: t.installation, link: `${base}/installation` },
        { text: t.source, link: `${base}/owning-the-source` },
        { text: t.composition, link: `${base}/composition` },
        { text: t.languages, link: `${base}/languages` },
        { text: t.scope, link: `${base}/scope` },
      ],
    },
    ...(Object.keys(nebulaLayers) as (keyof typeof nebulaLayers)[]).map((layer) => ({
      text: t[layer],
      collapsed: true,
      items: nebulaLayers[layer].map((title) => ({
        text: title,
        link: `${base}/components/${registryName(title)}`,
      })),
    })),
  ]
}

export default defineConfig({
  title: 'Ream',
  description: 'Rust Engine, Agnostic Modules',
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['meta', { name: 'theme-color', content: '#0c121e' }],
  ],

  // What a link to the docs shows when it is shared (Slack, Discord, X,
  // LinkedIn…): the page's own title and description, and the card image of
  // its language. Crawlers need absolute URLs, so they name the public domain.
  transformHead({ pageData, title, description }): HeadConfig[] {
    const site = 'https://reamjs.com'
    const lang = pageData.relativePath.startsWith('fr/') ? 'fr' : 'en'
    const path = `/${pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')}`
    return [
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:site_name', content: 'REAM' }],
      ['meta', { property: 'og:locale', content: lang === 'fr' ? 'fr_FR' : 'en_US' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: `${site}${path}` }],
      ['meta', { property: 'og:image', content: `${site}/images/og-${lang}.jpg` }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ]
  },

  // Inline code containing Vue-mustache syntax (`{{ … }}`) — common in the
  // inker / blackhole template docs — must not be compiled as a Vue
  // interpolation. VitePress applies `v-pre` to code BLOCKS but not to inline
  // code, so a valid-JS mustache (e.g. `{{ csrfField() }}`) silently compiles
  // and then throws at SSR render. Escape the braces in the rendered <code>
  // output: it displays literally and Vue never sees a `{{`.
  markdown: {
    // Fences Shiki has no grammar under these names: inker templates are Edge
    // syntax, `.env` files are dotenv. Otherwise they fall back to plain text.
    languageAlias: { inker: 'edge', env: 'dotenv' },
    config(md) {
      const prev = md.renderer.rules.code_inline
      md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
        const rendered = prev
          ? prev(tokens, idx, options, env, self)
          : `<code${self.renderAttrs(tokens[idx])}>${md.utils.escapeHtml(
              tokens[idx].content,
            )}</code>`
        return rendered
          .replace(/\{\{/g, '&#123;&#123;')
          .replace(/\}\}/g, '&#125;&#125;')
      }
    },
  },

  locales: {
    en: {
      label: 'English',
      lang: 'en',
      description: 'Rust Engine, Agnostic Modules. The comfort of a full-stack framework, the power of Rust, the freedom to choose.',
      link: '/en/',
      themeConfig: {
        nav: nav_en,
        sidebar: { ...sidebar_en, '/en/nebula/': nebulaSidebar('en') },
      },
    },
    fr: {
      label: 'Français',
      lang: 'fr',
      description: "Rust Engine, Agnostic Modules. Le confort d'un framework complet, la puissance de Rust, la liberté de choisir.",
      link: '/fr/',
      themeConfig: {
        // The default theme's own labels, which stay English unless translated.
        outline: { label: 'Sur cette page' },
        docFooter: { prev: 'Page précédente', next: 'Page suivante' },
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Retour en haut',
        langMenuLabel: 'Changer de langue',
        darkModeSwitchLabel: 'Apparence',
        lightModeSwitchTitle: 'Passer au thème clair',
        darkModeSwitchTitle: 'Passer au thème sombre',
        skipToContentLabel: 'Aller au contenu',
        notFound: {
          title: 'PAGE INTROUVABLE',
          quote: "Cette page n'existe pas, ou plus.",
          linkLabel: "Aller à l'accueil",
          linkText: "Retour à l'accueil",
          link: '/fr/',
        },
        nav: nav_fr,
        sidebar: { ...sidebar_fr, '/fr/nebula/': nebulaSidebar('fr') },
      },
    },
  },

  themeConfig: {
    logo: { light: '/logo-light.svg', dark: '/logo-dark.svg', alt: '' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/C9up/ream-dev' },
    ],
    // VitePress's built-in index: no service, built with the site.
    search: {
      provider: 'local',
      options: {
        locales: {
          fr: {
            translations: {
              button: { buttonText: 'Rechercher', buttonAriaLabel: 'Rechercher' },
              modal: {
                displayDetails: 'Afficher la liste détaillée',
                resetButtonTitle: 'Effacer la recherche',
                backButtonTitle: 'Fermer la recherche',
                noResultsText: 'Aucun résultat pour',
                footer: {
                  selectText: 'pour choisir',
                  selectKeyAriaLabel: 'Entrée',
                  navigateText: 'pour naviguer',
                  navigateUpKeyAriaLabel: 'Flèche haut',
                  navigateDownKeyAriaLabel: 'Flèche bas',
                  closeText: 'pour fermer',
                  closeKeyAriaLabel: 'Échap',
                },
              },
            },
          },
        },
      },
    },
  },
})
