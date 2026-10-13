# Ephemeris

`@c9up/ephemeris` describes a page to search engines in schema.org JSON-LD:
the whole vocabulary typed, the page's entities linked into one `@graph`, a
`<script type="application/ld+json">` whose content cannot end the tag, and
Google's rich-result requirements checked as each node is built.

It has no dependencies at run time and imports nothing from the framework:
Photon, Aurora and Inker each take its output as plain JSON-LD.

```bash
pnpm add @c9up/ephemeris
```

```ts
import { jsonLdScriptTag, product, SchemaGraph } from '@c9up/ephemeris'

const graph = new SchemaGraph({ url: 'https://shop.example/anvils/executive' })
  .identity({ '@type': 'Organization', name: 'ACME', url: 'https://shop.example/' })
  .mainEntity(
    product({
      '@type': 'Product',
      name: 'Executive Anvil',
      offers: { '@type': 'Offer', price: '119.95', priceCurrency: 'CHF' },
    }, { onWarning: () => {} }),
  )

console.log(jsonLdScriptTag(graph.toJsonLd(), { nonce: 'r4nd0m' }))
```

## Types

Every schema.org type and property, from release 30.1, under
`@c9up/ephemeris/schema` — or as the `Schema` namespace of the package root:

```ts
import type { Product, WithContext } from '@c9up/ephemeris/schema'

const anvil: WithContext<Product> = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Executive Anvil',
  offers: { '@type': 'Offer', price: '119.95', priceCurrency: 'CHF', availability: 'InStock' },
}
console.log(anvil.name)
```

For each class there is `XBase` (its properties), `XLeaf` (its literal
`@type`) and `X`, the union of the leaf and every subclass — so a `Thing`
accepts a `LocalBusiness`. A property takes one value or an array, a `Role`,
or an `{ '@id' }` reference to a node described elsewhere; an enumeration takes
its member's URL or short name (`'https://schema.org/InStock'` or
`'InStock'`). `Organization`, `Person` and `Place` also take a plain name. A
node of several types is `MergeLeafTypes<[ProductLeaf, SoftwareApplicationLeaf]>`.

An unknown property, a wrong `@type` or a value outside a property's range
does not compile. The types are generated from the release file kept in the
package's repository and compile to no code.

## The graph

`SchemaGraph` holds the entities of one page and links them:

```ts
import { SchemaGraph } from '@c9up/ephemeris'

const graph = new SchemaGraph({ url: 'https://shop.example/anvils/executive' })
  .identity({ '@type': 'Organization', name: 'ACME' })
  .website({ '@type': 'WebSite', name: 'ACME shop', url: 'https://shop.example/' })
  .webPage({ '@type': 'ItemPage', name: 'Executive Anvil' })
  .mainEntity({ '@type': 'Product', name: 'Executive Anvil' })
  .add({ '@type': 'Person', '@id': '#author', name: 'Ada' })

console.log(JSON.stringify(graph.toJsonLd(), null, 2))
```

| Slot | `@id` |
|---|---|
| `identity(node)` | `<site>#identity` — the organization or person behind the site |
| `website(node)` | `<site>#website` |
| `webPage(node)` | `<url>#webpage` |
| `breadcrumb(node)` | `<url>#breadcrumb` |
| `mainEntity(node)` | `<url>#main-entity` — what the page is about |
| `add(node, { id })` | its own `@id` (a relative one resolved against the page), or `<url>#/schema/<type>/<id or rank>` |

The site is the page URL's origin unless `site` is given. The website is
published by the identity; the page is part of the website and has its
breadcrumb and main entity, which has the page. Each link is set only when
both nodes are there, and never over a value the caller set.

A layout and a page may describe the same node: the declarations merge, the
`@type`s are united, and what the later one sets wins. Nothing is invented,
empty values (`undefined`, `null`, `''`, `[]`, `{}`) are dropped, and keys are
ordered, so a page renders the same bytes every time.

## The script tag

```ts
import { jsonLdScriptTag, stringifyJsonLd, toJsonLd } from '@c9up/ephemeris'

const node = { '@type': 'Product', name: '</script><script>alert(1)</script>' }

console.log(jsonLdScriptTag(node, { nonce: 'r4nd0m' })) // for <head>
console.log(stringifyJsonLd(node))                       // the JSON text alone
console.log(toJsonLd(node))                              // the plain object
```

The text has no `<`, `>` or `&`: they are written `\u003c`, `\u003e` and
`\u0026`, which JSON reads back as the same characters, so no `</script>` or
`<!--` can end or derail the tag; U+2028 and U+2029 are escaped too. The nonce
is the request's, passed in — the package never makes one up.

`undefined` is left out and a `Date` is written in UTC, the same on every
machine. What JSON would hold wrongly or throw on is refused, naming where it
is: a function, a symbol, a `bigint`, `NaN`, a `Map`, a cycle, or data nested
more than 64 levels deep.

## Google's requirements

A helper per rich result checks the node against what Google Search needs of
it, read from Search Central — each rule carries its page and the page's date:

| Helper | Rule |
|---|---|
| `organization`, `localBusiness`, `person` | Organization, LocalBusiness |
| `website`, `webPage`, `profilePage`, `breadcrumb` | site names, ProfilePage, BreadcrumbList |
| `article` | Article, NewsArticle, BlogPosting |
| `product`, `merchantListing` | product snippet, merchant listing — with their offers, reviews and rating |
| `review`, `aggregateRating` | review snippet |
| `event`, `jobPosting`, `recipe`, `video`, `softwareApplication`, `course` | their rich results |

```ts
import { breadcrumb, localBusiness, RequirementError, type RequirementWarning } from '@c9up/ephemeris'

const warnings: RequirementWarning[] = []
localBusiness(
  {
    '@type': 'Store',
    name: 'ACME Biel',
    address: { '@type': 'PostalAddress', streetAddress: 'Rue du Lac 1268', addressLocality: 'Biel', postalCode: '2501', addressCountry: 'CH' },
  },
  { onWarning: (warning) => warnings.push(warning) },
)
console.log(warnings.map((warning) => warning.property)) // what Google recommends and is missing

try {
  breadcrumb([{ name: 'Home', item: 'https://shop.example/' }])
} catch (error) {
  if (error instanceof RequirementError) console.log(error.type, error.property)
}
```

A missing required property throws a `RequirementError`
(`E_EPHEMERIS_MISSING_REQUIRED`), with `type`, `property` and `source`. A
missing recommended one is a warning, never an error: it goes to `onWarning`,
or is written once per kind with `console.warn`; `{ onWarning: () => {} }`
silences it.

Every helper also holds what it is given to the form Google reads, and
refuses rather than converts:

- text is under 10,000 characters, a breadcrumb under 32 items;
- a URL (`url`, `sameAs`, `logo`, `image`, `item`…) is absolute http(s) —
  `javascript:` and `data:` are refused;
- a price is a number or decimal digits with a `.`: `'CHF 12'`, `'1,234.50'`
  and `-1` are refused;
- a currency is a three-letter ISO 4217 code;
- a date is ISO 8601 and exists; a date-time without a time zone is a warning.

FAQ and How-to are not covered: Google no longer shows them.

## With Photon, Aurora and Inker

Each takes the JSON-LD as plain data and writes it in `<head>` with the
request's nonce, escaped:

- **Photon** — `ctx.photon.meta({ jsonLd: graph.toJsonLd() })`, or the
  `@Meta()` decorator and `defaultMeta`; layers merge by `@id`, and an SPA
  navigation replaces the previous page's. See [Photon](/en/modules/photon).
- **Aurora** — `renderPage(ctx, pages, 'Product', props, { jsonLd: graph.toJsonLd() })`.
  See [Aurora](/en/modules/aurora).
- **Inker** — `{{ html.jsonLd(jsonLd, cspNonce()) }}` in a template. See
  [Inker](/en/modules/inker).

## Errors

| Code | Raised when |
|---|---|
| `E_EPHEMERIS_MISSING_REQUIRED` | a property Google requires is missing (`RequirementError`) |
| `E_EPHEMERIS_INVALID_URL` | a URL that is not absolute http(s) |
| `E_EPHEMERIS_INVALID_PRICE` | a price that is not a number or decimal digits |
| `E_EPHEMERIS_INVALID_CURRENCY` | a currency that is not a three-letter code |
| `E_EPHEMERIS_INVALID_DATE` | a date that is not ISO 8601, or does not exist |
| `E_EPHEMERIS_INVALID_NODE` | a node that is not a plain object, or has no `@type` |
| `E_EPHEMERIS_INVALID_VALUE` | a value JSON cannot hold faithfully |
| `E_EPHEMERIS_UNSAFE_KEY` | a `__proto__`, `constructor` or `prototype` key |
| `E_EPHEMERIS_CYCLE` | data that contains itself |
| `E_EPHEMERIS_TOO_DEEP` | data nested more than 64 levels deep |
| `E_EPHEMERIS_TOO_LONG` | text over 10,000 characters |
| `E_EPHEMERIS_TOO_MANY` | a breadcrumb of more than 32 items |

Each is an `EphemerisError` with its `code`.

## License

MIT, except the schema.org vocabulary and the types generated from it, which
are © the schema.org sponsors under Creative Commons Attribution-ShareAlike
3.0 — see the package's NOTICE.
