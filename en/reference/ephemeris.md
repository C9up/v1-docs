# ephemeris

`@c9up/ephemeris`: schema.org structured data: the whole vocabulary typed, a page's entities linked into one `@graph`, JSON-LD that cannot break out of its script tag, and Google's rich-result requirements checked as each node is built. Guide: [Structured data](/en/guides/frontend/structured-data).

## Installation

```bash
pnpm add @c9up/ephemeris
```

ephemeris has no provider, no configuration and no dependency at run time.

## Entry points

| Import | Contents |
|---|---|
| `@c9up/ephemeris` | `SchemaGraph`, the node helpers, their rules, serialization, errors, the `Schema` type namespace |
| `@c9up/ephemeris/schema` | The schema.org vocabulary (release 30.1) as TypeScript types, one per type |

## Exports

### `@c9up/ephemeris`

| Export | Kind | Description |
|---|---|---|
| `SchemaGraph` | class | One page's nodes, linked by generated `@id`s, written as a single `@graph`. |
| `toJsonLd` | function | `toJsonLd(data: object): JsonLdValue`: plain data, `undefined` left out, dates as ISO strings; anything JSON cannot hold is refused. |
| `stringifyJsonLd` | function | `stringifyJsonLd(data: object): string`: the JSON text with `<`, `>`, `&`, U+2028 and U+2029 escaped. |
| `jsonLdScriptTag` | function | `jsonLdScriptTag(data: object, options?: ScriptTagOptions): string`: `<script type="application/ld+json">` for `<head>`, with the request's CSP nonce when given. |
| `errors` | namespace | The package's errors, one class per code, see [Errors](#errors). `errors.E_EPHEMERIS_MISSING_REQUIRED` carries `type`, `property` and `source` (the Search Central page). |
| `MAX_TEXT_LENGTH` | const | `10000`: the longest text value accepted. |
| `MAX_BREADCRUMB_ITEMS` | const | `32`. |
| `Schema` | type namespace | `@c9up/ephemeris/schema`, as `Schema.Product`, `Schema.Article`… |
| `SchemaGraphOptions` | interface | `CheckOptions & { url: string; site?: string }`. |
| `CheckOptions` | interface | `{ onWarning?: WarningHandler }`. Without it, each kind of warning is written once per process with `console.warn`; `() => {}` silences them. |
| `WarningHandler` | type | `(warning: RequirementWarning) => void`. |
| `RequirementWarning` | interface | `{ code; type; property; message; source }`. `code` is `W_EPHEMERIS_MISSING_RECOMMENDED`, `W_EPHEMERIS_LOW_PRECISION`, `W_EPHEMERIS_TOO_LONG_FOR_GOOGLE` or `W_EPHEMERIS_NO_TIMEZONE`. |
| `Rule` | interface | `{ type; source; read; required?; recommended?; checks? }`: what a helper checks, with its Search Central page and the date it was read. |
| `Requirement` | type | `string \| readonly [string, ...string[]]`: a property, dotted for a nested one, or alternatives. |
| `Crumb` | interface | `{ name: string; item?: string }`. |
| `JsonLdValue` | type | What `JSON.parse` would give back. |
| `ScriptTagOptions` | interface | `{ nonce?: string }`. |

### Node helpers

Each helper checks a node and returns it unchanged, typed as given: `helper<T>(node: T, options?: CheckOptions): T`. A missing required property throws `errors.E_EPHEMERIS_MISSING_REQUIRED`; a missing recommended one is a warning. Every helper also bounds the node (depth, text length, URLs, dates, prices, currencies).

| Helper | schema.org type | Rule |
|---|---|---|
| `organization` | `Organization` | `ORGANIZATION` |
| `localBusiness` | `LocalBusiness` | `LOCAL_BUSINESS` |
| `person` | `Person` (bounded only; `person(node)` takes no options) | — |
| `website` | `WebSite` | `WEBSITE` |
| `webPage` | `WebPage` | `WEB_PAGE` |
| `profilePage` | `ProfilePage` | `PROFILE_PAGE` |
| `breadcrumb` | `BreadcrumbList`, built from `crumbs: readonly Crumb[]`, two to 32 items | `BREADCRUMB` |
| `article` | `Article` and its subtypes | `ARTICLE` |
| `product` | `Product` (product snippet; offers, reviews and rating checked) | `PRODUCT` |
| `merchantListing` | `Product` sold by the page | `MERCHANT_LISTING` |
| `review` | `Review` | `REVIEW` |
| `aggregateRating` | `AggregateRating` | `AGGREGATE_RATING` |
| `event` | `Event` | `EVENT` |
| `jobPosting` | `JobPosting` | `JOB_POSTING` |
| `recipe` | `Recipe` | `RECIPE` |
| `video` | `VideoObject` | `VIDEO` |
| `softwareApplication` | `SoftwareApplication` | `SOFTWARE_APPLICATION` |
| `course` | `Course` | `COURSE` |
| `itemList` | `ItemList` | `ITEM_LIST` |
| `dataset` | `Dataset` | `DATASET` |
| `discussionForumPosting` | `DiscussionForumPosting` (comments checked at every depth) | `DISCUSSION_FORUM_POSTING` |
| `quiz` | `Quiz` | `QUIZ` |
| `employerAggregateRating` | `EmployerAggregateRating` | `EMPLOYER_AGGREGATE_RATING` |
| `imageObject` | `ImageObject` with license metadata | `IMAGE_LICENSE` |
| `memberProgram` | `MemberProgram` | `MEMBER_PROGRAM` |
| `mathSolver` | `MathSolver` | `MATH_SOLVER` |
| `movie` | `Movie` | `MOVIE` |
| `qaPage` | `QAPage` (question and answers checked) | `QA_PAGE` |
| `merchantReturnPolicy` | `MerchantReturnPolicy` | `MERCHANT_RETURN_POLICY` |
| `shippingService` | `ShippingService` | `SHIPPING_SERVICE` |
| `vacationRental` | `VacationRental` | `VACATION_RENTAL` |
| `productGroup` | `ProductGroup` | `PRODUCT_GROUP` |

The rules applied to nested nodes are exported too: `NESTED_REVIEW`, `NESTED_AGGREGATE_RATING`, `OFFER`, `AGGREGATE_OFFER`, `MERCHANT_OFFER`, `OFFER_SHIPPING_DETAILS`, `COMMENT`, `QUESTION`, `ANSWER`, `SPEAKABLE`.

### `SchemaGraph`

`new SchemaGraph(options: SchemaGraphOptions)`: `url` is the page's absolute URL; `site`, the site's home, defaults to its origin.

| Member | Signature | Description |
|---|---|---|
| `identity` | `identity(node: Organization \| Person): this` | The organization or person behind the site, `<site>#identity`. |
| `website` | `website(node: WebSite): this` | `<site>#website`, published by the identity. |
| `webPage` | `webPage(node: WebPage): this` | `<url>#webpage`, part of the website. |
| `breadcrumb` | `breadcrumb(node: BreadcrumbList): this` | `<url>#breadcrumb`. |
| `mainEntity` | `mainEntity(node: Node): this` | What the page is about, `<url>#main-entity`. |
| `add` | `add(node: Node, options?: { id?: string \| number }): this` | Any other node; it keeps its own `@id`, or gets `<url>#/schema/<type>/<id>`. |
| `toJsonLd` | `toJsonLd(): { '@context': 'https://schema.org'; '@graph': JsonLdValue[] }` | The graph, root nodes first, ready for `jsonLdScriptTag`. |

## Errors

| Code | Raised when |
|---|---|
| [`E_EPHEMERIS_INVALID_NODE`](/en/reference/errors#e-ephemeris-invalid-node) | A node has no `@type`. |
| [`E_EPHEMERIS_INVALID_URL`](/en/reference/errors#e-ephemeris-invalid-url) | A URL is not absolute. |
| [`E_EPHEMERIS_INVALID_DATE`](/en/reference/errors#e-ephemeris-invalid-date) | A date is not ISO 8601. |
| [`E_EPHEMERIS_INVALID_VALUE`](/en/reference/errors#e-ephemeris-invalid-value) | A value cannot be serialized. |
| [`E_EPHEMERIS_INVALID_PRICE`](/en/reference/errors#e-ephemeris-invalid-price) | A price is neither a number nor digits with a decimal point. |
| [`E_EPHEMERIS_INVALID_CURRENCY`](/en/reference/errors#e-ephemeris-invalid-currency) | A currency is not an ISO 4217 code. |
| [`E_EPHEMERIS_MISSING_REQUIRED`](/en/reference/errors#e-ephemeris-missing-required) | A node lacks a property Google requires for its rich result. |
| [`E_EPHEMERIS_UNSAFE_KEY`](/en/reference/errors#e-ephemeris-unsafe-key) | A key such as `__proto__`. |
| [`E_EPHEMERIS_ID_TAKEN`](/en/reference/errors#e-ephemeris-id-taken) | An `@id` the graph generated for one node was given to another. |
| [`E_EPHEMERIS_SLOT_TAKEN`](/en/reference/errors#e-ephemeris-slot-taken) | A graph slot (`identity`, `website`…) is already taken. |
| [`E_EPHEMERIS_CYCLE`](/en/reference/errors#e-ephemeris-cycle) | A node contains itself. |
| [`E_EPHEMERIS_TOO_DEEP`](/en/reference/errors#e-ephemeris-too-deep) | The data is nested deeper than 64 levels. |
| [`E_EPHEMERIS_TOO_LONG`](/en/reference/errors#e-ephemeris-too-long) | A text value is longer than `MAX_TEXT_LENGTH`. |
| [`E_EPHEMERIS_TOO_MANY`](/en/reference/errors#e-ephemeris-too-many) | A list, such as a breadcrumb, has more items than allowed. |

## Migration

- `EphemerisError` is gone: test `error.code`, or `error instanceof errors.E_EPHEMERIS_*` with `import { errors } from '@c9up/ephemeris'`.
- `RequirementError` becomes `errors.E_EPHEMERIS_MISSING_REQUIRED`, with the same `type`, `property` and `source`.

## See also

- [Structured data](/en/guides/frontend/structured-data)
- [Photon head](/en/guides/frontend/photon/head)
