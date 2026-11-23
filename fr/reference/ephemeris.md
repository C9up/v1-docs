# ephemeris

`@c9up/ephemeris` : les données structurées schema.org : tout le vocabulaire typé, les entités d'une page reliées en un seul `@graph`, un JSON-LD qui ne peut pas sortir de sa balise script, et les exigences de Google pour les résultats enrichis vérifiées à la construction de chaque nœud. Guide : [Données structurées](/fr/guides/frontend/structured-data).

## Installation

```bash
pnpm add @c9up/ephemeris
```

ephemeris n'a ni provider, ni configuration, ni dépendance à l'exécution.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/ephemeris` | `SchemaGraph`, les aides de nœuds, leurs règles, la sérialisation, les erreurs, l'espace de types `Schema` |
| `@c9up/ephemeris/schema` | Le vocabulaire schema.org (version 30.1) en types TypeScript, un par type |

## Exports

### `@c9up/ephemeris`

| Export | Nature | Description |
|---|---|---|
| `SchemaGraph` | classe | Les nœuds d'une page, reliés par des `@id` générés, écrits en un seul `@graph`. |
| `toJsonLd` | fonction | `toJsonLd(data: object): JsonLdValue` : des données simples, `undefined` omis, dates en chaînes ISO ; ce que JSON ne sait pas porter est refusé. |
| `stringifyJsonLd` | fonction | `stringifyJsonLd(data: object): string` : le texte JSON avec `<`, `>`, `&`, U+2028 et U+2029 échappés. |
| `jsonLdScriptTag` | fonction | `jsonLdScriptTag(data: object, options?: ScriptTagOptions): string` : `<script type="application/ld+json">` pour le `<head>`, avec le nonce CSP de la requête s'il est fourni. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs). `errors.E_EPHEMERIS_MISSING_REQUIRED` porte `type`, `property` et `source` (la page Search Central). |
| `MAX_TEXT_LENGTH` | constante | `10000` : la plus longue valeur texte acceptée. |
| `MAX_BREADCRUMB_ITEMS` | constante | `32`. |
| `Schema` | espace de types | `@c9up/ephemeris/schema`, sous la forme `Schema.Product`, `Schema.Article`… |
| `SchemaGraphOptions` | interface | `CheckOptions & { url: string; site?: string }`. |
| `CheckOptions` | interface | `{ onWarning?: WarningHandler }`. Sans lui, chaque sorte d'avertissement est écrite une fois par processus avec `console.warn` ; `() => {}` les fait taire. |
| `WarningHandler` | type | `(warning: RequirementWarning) => void`. |
| `RequirementWarning` | interface | `{ code; type; property; message; source }`. `code` vaut `W_EPHEMERIS_MISSING_RECOMMENDED`, `W_EPHEMERIS_LOW_PRECISION`, `W_EPHEMERIS_TOO_LONG_FOR_GOOGLE` ou `W_EPHEMERIS_NO_TIMEZONE`. |
| `Rule` | interface | `{ type; source; read; required?; recommended?; checks? }` : ce que vérifie une aide, avec sa page Search Central et la date de lecture. |
| `Requirement` | type | `string \| readonly [string, ...string[]]` : une propriété, pointée pour une propriété imbriquée, ou des alternatives. |
| `Crumb` | interface | `{ name: string; item?: string }`. |
| `JsonLdValue` | type | Ce que rendrait `JSON.parse`. |
| `ScriptTagOptions` | interface | `{ nonce?: string }`. |

### Aides de nœuds

Chaque aide vérifie un nœud et le renvoie inchangé, typé tel que donné : `aide<T>(node: T, options?: CheckOptions): T`. Une propriété exigée absente lève `errors.E_EPHEMERIS_MISSING_REQUIRED` ; une propriété recommandée absente est un avertissement. Chaque aide borne aussi le nœud (profondeur, longueur des textes, URL, dates, prix, devises).

| Aide | Type schema.org | Règle |
|---|---|---|
| `organization` | `Organization` | `ORGANIZATION` |
| `localBusiness` | `LocalBusiness` | `LOCAL_BUSINESS` |
| `person` | `Person` (borné seulement ; `person(node)` ne prend pas d'options) | — |
| `website` | `WebSite` | `WEBSITE` |
| `webPage` | `WebPage` | `WEB_PAGE` |
| `profilePage` | `ProfilePage` | `PROFILE_PAGE` |
| `breadcrumb` | `BreadcrumbList`, construit depuis `crumbs: readonly Crumb[]`, de deux à 32 éléments | `BREADCRUMB` |
| `article` | `Article` et ses sous-types | `ARTICLE` |
| `product` | `Product` (fiche produit ; offres, avis et note vérifiés) | `PRODUCT` |
| `merchantListing` | `Product` vendu par la page | `MERCHANT_LISTING` |
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
| `discussionForumPosting` | `DiscussionForumPosting` (commentaires vérifiés à toute profondeur) | `DISCUSSION_FORUM_POSTING` |
| `quiz` | `Quiz` | `QUIZ` |
| `employerAggregateRating` | `EmployerAggregateRating` | `EMPLOYER_AGGREGATE_RATING` |
| `imageObject` | `ImageObject` avec ses métadonnées de licence | `IMAGE_LICENSE` |
| `memberProgram` | `MemberProgram` | `MEMBER_PROGRAM` |
| `mathSolver` | `MathSolver` | `MATH_SOLVER` |
| `movie` | `Movie` | `MOVIE` |
| `qaPage` | `QAPage` (question et réponses vérifiées) | `QA_PAGE` |
| `merchantReturnPolicy` | `MerchantReturnPolicy` | `MERCHANT_RETURN_POLICY` |
| `shippingService` | `ShippingService` | `SHIPPING_SERVICE` |
| `vacationRental` | `VacationRental` | `VACATION_RENTAL` |
| `productGroup` | `ProductGroup` | `PRODUCT_GROUP` |

Les règles appliquées aux nœuds imbriqués sont exportées aussi : `NESTED_REVIEW`, `NESTED_AGGREGATE_RATING`, `OFFER`, `AGGREGATE_OFFER`, `MERCHANT_OFFER`, `OFFER_SHIPPING_DETAILS`, `COMMENT`, `QUESTION`, `ANSWER`, `SPEAKABLE`.

### `SchemaGraph`

`new SchemaGraph(options: SchemaGraphOptions)` : `url` est l'URL absolue de la page ; `site`, l'accueil du site, vaut son origine par défaut.

| Membre | Signature | Description |
|---|---|---|
| `identity` | `identity(node: Organization \| Person): this` | L'organisation ou la personne derrière le site, `<site>#identity`. |
| `website` | `website(node: WebSite): this` | `<site>#website`, publié par l'identité. |
| `webPage` | `webPage(node: WebPage): this` | `<url>#webpage`, partie du site. |
| `breadcrumb` | `breadcrumb(node: BreadcrumbList): this` | `<url>#breadcrumb`. |
| `mainEntity` | `mainEntity(node: Node): this` | Le sujet de la page, `<url>#main-entity`. |
| `add` | `add(node: Node, options?: { id?: string \| number }): this` | Tout autre nœud ; il garde son `@id`, ou reçoit `<url>#/schema/<type>/<id>`. |
| `toJsonLd` | `toJsonLd(): { '@context': 'https://schema.org'; '@graph': JsonLdValue[] }` | Le graphe, nœuds racines d'abord, prêt pour `jsonLdScriptTag`. |

## Erreurs

| Code | Levée quand |
|---|---|
| [`E_EPHEMERIS_INVALID_NODE`](/fr/reference/errors#e-ephemeris-invalid-node) | Un nœud n'a pas de `@type`. |
| [`E_EPHEMERIS_INVALID_URL`](/fr/reference/errors#e-ephemeris-invalid-url) | Une URL n'est pas absolue. |
| [`E_EPHEMERIS_INVALID_DATE`](/fr/reference/errors#e-ephemeris-invalid-date) | Une date n'est pas en ISO 8601. |
| [`E_EPHEMERIS_INVALID_VALUE`](/fr/reference/errors#e-ephemeris-invalid-value) | Une valeur ne peut pas être sérialisée. |
| [`E_EPHEMERIS_INVALID_PRICE`](/fr/reference/errors#e-ephemeris-invalid-price) | Un prix n'est ni un nombre ni des chiffres avec un point décimal. |
| [`E_EPHEMERIS_INVALID_CURRENCY`](/fr/reference/errors#e-ephemeris-invalid-currency) | Une devise n'est pas un code ISO 4217. |
| [`E_EPHEMERIS_MISSING_REQUIRED`](/fr/reference/errors#e-ephemeris-missing-required) | Un nœud n'a pas une propriété que Google exige pour son résultat enrichi. |
| [`E_EPHEMERIS_UNSAFE_KEY`](/fr/reference/errors#e-ephemeris-unsafe-key) | Une clé comme `__proto__`. |
| [`E_EPHEMERIS_ID_TAKEN`](/fr/reference/errors#e-ephemeris-id-taken) | Un `@id` généré pour un nœud a été donné à un autre. |
| [`E_EPHEMERIS_SLOT_TAKEN`](/fr/reference/errors#e-ephemeris-slot-taken) | Une place du graphe (`identity`, `website`…) est déjà prise. |
| [`E_EPHEMERIS_CYCLE`](/fr/reference/errors#e-ephemeris-cycle) | Un nœud se contient lui-même. |
| [`E_EPHEMERIS_TOO_DEEP`](/fr/reference/errors#e-ephemeris-too-deep) | Les données sont imbriquées sur plus de 64 niveaux. |
| [`E_EPHEMERIS_TOO_LONG`](/fr/reference/errors#e-ephemeris-too-long) | Une valeur texte dépasse `MAX_TEXT_LENGTH`. |
| [`E_EPHEMERIS_TOO_MANY`](/fr/reference/errors#e-ephemeris-too-many) | Une liste, comme un fil d'Ariane, a trop d'éléments. |

## Migration

- `EphemerisError` disparaît : testez `error.code`, ou `error instanceof errors.E_EPHEMERIS_*` avec `import { errors } from '@c9up/ephemeris'`.
- `RequirementError` devient `errors.E_EPHEMERIS_MISSING_REQUIRED`, avec les mêmes `type`, `property` et `source`.

## Voir aussi

- [Données structurées](/fr/guides/frontend/structured-data)
- [Photon : head](/fr/guides/frontend/photon/head)
