# Ephemeris

`@c9up/ephemeris` décrit une page aux moteurs de recherche en JSON-LD
schema.org : tout le vocabulaire typé, les entités de la page reliées en un
seul `@graph`, une balise `<script type="application/ld+json">` dont le contenu
ne peut pas fermer la balise, et les exigences de Google pour les résultats
enrichis vérifiées à la construction de chaque nœud.

Il n'a aucune dépendance à l'exécution et n'importe rien du framework :
Photon, Aurora et Inker prennent chacun sa sortie comme du JSON-LD simple.

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

## Les types

Chaque type et chaque propriété de schema.org, version 30.1, sous
`@c9up/ephemeris/schema` — ou dans l'espace de noms `Schema` de la racine du
paquet :

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

Pour chaque classe, il y a `XBase` (ses propriétés), `XLeaf` (son `@type`
littéral) et `X`, l'union de la feuille et de toutes ses sous-classes — un
`Thing` accepte donc un `LocalBusiness`. Une propriété prend une valeur ou un
tableau, un `Role`, ou une référence `{ '@id' }` vers un nœud décrit ailleurs ;
une énumération prend l'URL ou le nom court de son membre
(`'https://schema.org/InStock'` ou `'InStock'`). `Organization`, `Person` et
`Place` prennent aussi un simple nom. Un nœud de plusieurs types s'écrit
`MergeLeafTypes<[ProductLeaf, SoftwareApplicationLeaf]>`.

Une propriété inconnue, un mauvais `@type` ou une valeur hors de la portée
d'une propriété ne compile pas. Les types sont générés depuis le fichier de la
version conservé dans le dépôt du paquet, et ne produisent aucun code.

## Le graphe

`SchemaGraph` réunit les entités d'une page et les relie :

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

| Emplacement | `@id` |
|---|---|
| `identity(node)` | `<site>#identity` — l'organisation ou la personne derrière le site |
| `website(node)` | `<site>#website` |
| `webPage(node)` | `<url>#webpage` |
| `breadcrumb(node)` | `<url>#breadcrumb` |
| `mainEntity(node)` | `<url>#main-entity` — ce dont parle la page |
| `add(node, { id })` | son propre `@id` (un relatif est résolu sur la page), ou `<url>#/schema/<type>/<id ou rang>` |

Le site est l'origine de l'URL de la page, sauf si `site` est donné. Le site
web est publié par l'identité ; la page fait partie du site et pointe vers son
fil d'Ariane et son entité principale, qui pointe vers la page. Chaque lien
n'est posé que si les deux nœuds sont là, et jamais par-dessus une valeur
fixée par l'appelant.

Un layout et une page peuvent décrire le même nœud : les déclarations
fusionnent, les `@type` s'additionnent et ce que fixe la plus récente
l'emporte. Rien n'est inventé, les valeurs vides (`undefined`, `null`, `''`,
`[]`, `{}`) sont retirées, et les clés sont triées : une page donne les mêmes
octets à chaque rendu.

Chaque nœud est normalisé à l'ajout : une `Date` devient sa chaîne ISO, une
valeur avec `toJSON` ce qu'elle donne, et une valeur que JSON ne sait pas
tenir (`NaN`, `Infinity`, une `Map`, une instance de classe, une fonction) est
refusée (`E_EPHEMERIS_INVALID_VALUE`). `toJsonLd()` rend donc des données
simples que n'importe quel `JSON.stringify` — celui de Photon, d'Inker,
d'Aurora — écrit fidèlement.

## La balise script

```ts
import { jsonLdScriptTag, stringifyJsonLd, toJsonLd } from '@c9up/ephemeris'

const node = { '@type': 'Product', name: '</script><script>alert(1)</script>' }

console.log(jsonLdScriptTag(node, { nonce: 'r4nd0m' })) // pour <head>
console.log(stringifyJsonLd(node))                       // le texte JSON seul
console.log(toJsonLd(node))                              // l'objet simple
```

Le texte ne contient aucun `<`, `>` ni `&` : ils sont écrits `\u003c`, `\u003e` et `\u0026`, que
JSON relit comme les mêmes caractères ; aucun `</script>` ni `<!--` ne peut
donc fermer ou dérouter la balise. U+2028 et U+2029 sont échappés aussi. Le
nonce est celui de la requête, passé par l'appelant : le paquet n'en fabrique
jamais.

`undefined` est retiré et une `Date` est écrite en UTC, la même sur toutes les
machines. Ce que JSON tiendrait mal ou ferait planter est refusé, avec
l'endroit fautif : une fonction, un symbole, un `bigint`, `NaN`, une `Map`, un
cycle, ou une imbrication de plus de 64 niveaux.

## Les exigences de Google

Une fonction d'aide par résultat enrichi vérifie le nœud contre ce que Google
Search en exige, lu dans Search Central — chaque règle porte sa page et la date
de cette page :

| Fonction | Règle |
|---|---|
| `organization`, `localBusiness`, `person` | Organization, LocalBusiness |
| `website`, `webPage`, `profilePage`, `breadcrumb` | noms de site, ProfilePage, BreadcrumbList |
| `article` | Article, NewsArticle, BlogPosting |
| `product`, `merchantListing` | extrait produit, fiche marchand — avec leurs offres, avis et note |
| `review`, `aggregateRating` | extrait d'avis |
| `event`, `jobPosting`, `recipe`, `video`, `softwareApplication`, `course` | leurs résultats enrichis |
| `itemList`, `movie` | carrousels |
| `dataset`, `discussionForumPosting`, `qaPage`, `quiz` | jeux de données, forums (commentaires à toute profondeur), pages de questions-réponses, Q&A éducatives |
| `employerAggregateRating`, `imageObject`, `vacationRental`, `productGroup`, `mathSolver` | notes d'employeur, licences d'image, locations de vacances, variantes de produit, solveurs mathématiques |
| `merchantReturnPolicy`, `shippingService`, `memberProgram` | politiques de retour, de livraison et de fidélité — vérifiées aussi là où une organisation ou une offre marchande les porte |

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
console.log(warnings.map((warning) => warning.property)) // ce que Google recommande et qui manque

try {
  breadcrumb([{ name: 'Home', item: 'https://shop.example/' }])
} catch (error) {
  if (error instanceof RequirementError) console.log(error.type, error.property)
}
```

Une propriété requise qui manque lève une `RequirementError`
(`E_EPHEMERIS_MISSING_REQUIRED`), avec `type`, `property` et `source`. Une
propriété recommandée qui manque est un avertissement, jamais une erreur : il
va à `onWarning`, ou est écrit une fois par sorte avec `console.warn` ;
`{ onWarning: () => {} }` le fait taire.

Chaque fonction tient aussi ce qu'on lui donne à la forme que lit Google, et
refuse plutôt que de convertir :

- un texte fait moins de 10 000 caractères, un fil d'Ariane moins de 32
  éléments ;
- une URL est absolue en http(s) — `javascript:` et `data:` sont refusées —
  dans toute propriété que schema.org n'accepte qu'en URL (`url`, `sameAs`,
  `logo`, `image`, `codeRepository`, `isPartOf`…, liste générée depuis le
  vocabulaire), ainsi que dans `item`, `target` et `urlTemplate` ;
- là où une propriété accepte une URL ou du texte (`keywords`,
  `additionalType`…), le texte reste du texte, mais une URL `javascript:`,
  `vbscript:`, `data:`, `file:` ou `blob:` est refusée ;
- un `@id` est relatif, ou un IRI `http(s):`, `urn:`, `mailto:` ou `tel:` ;
- une valeur est vérifiée telle qu'elle sera écrite : une instance de `URL`,
  une `Date` ou tout ce qui a un `toJSON` est tenu aux mêmes formes que la
  chaîne qu'il donne, et un objet que JSON écrirait `{}` (une `Map`, une
  classe) est refusé ;
- un prix est un nombre, ou des chiffres avec un point décimal : `'CHF 12'`,
  `'1,234.50'` et `-1` sont refusés ;
- une devise est un code ISO 4217, d'après la liste de l'agence de maintenance ;
- une date est au format ISO 8601 et existe ; une date-heure sans fuseau est un
  avertissement.

Une section `speakable` doit donner son sélecteur CSS ou son XPath, et un contenu payant (`isAccessibleForFree: false`) un `hasPart` qui nomme sa section. Non couverts : FAQ et HowTo, que Google n'affiche plus ; les vérifications de faits (ClaimReview), dont Google retire la prise en charge ; et les actions de livre, qui passent par un flux de fournisseurs agréés.

## Avec Photon, Aurora et Inker

Chacun prend le JSON-LD comme de simples données et l'écrit dans `<head>` avec
le nonce de la requête, échappé :

- **Photon** — `ctx.photon.meta({ jsonLd: graph.toJsonLd() })`, ou le décorateur
  `@Meta()` et `defaultMeta` ; les couches fusionnent par `@id`, et une
  navigation SPA remplace celui de la page précédente. Voir
  [Photon](/fr/modules/photon).
- **Aurora** — `renderPage(ctx, pages, 'Product', props, { jsonLd: graph.toJsonLd() })`.
  Voir [Aurora](/fr/modules/aurora).
- **Inker** — `{{ html.jsonLd(jsonLd, cspNonce()) }}` dans un template. Voir
  [Inker](/fr/modules/inker).

## Erreurs

| Code | Levée quand |
|---|---|
| `E_EPHEMERIS_MISSING_REQUIRED` | une propriété exigée par Google manque (`RequirementError`) |
| `E_EPHEMERIS_INVALID_URL` | une URL qui n'est pas absolue en http(s) |
| `E_EPHEMERIS_INVALID_PRICE` | un prix qui n'est ni un nombre ni des chiffres décimaux |
| `E_EPHEMERIS_INVALID_CURRENCY` | une devise qui n'est pas un code de trois lettres |
| `E_EPHEMERIS_INVALID_DATE` | une date qui n'est pas en ISO 8601, ou qui n'existe pas |
| `E_EPHEMERIS_INVALID_NODE` | un nœud qui n'est pas un objet simple, ou sans `@type` |
| `E_EPHEMERIS_INVALID_VALUE` | une valeur que JSON ne peut pas tenir fidèlement |
| `E_EPHEMERIS_UNSAFE_KEY` | une clé `__proto__`, `constructor` ou `prototype` |
| `E_EPHEMERIS_SLOT_TAKEN` | un second nœud, d'un autre `@id`, mis dans un emplacement déjà rempli |
| `E_EPHEMERIS_ID_TAKEN` | un `options.id` ou un `@id` égal au `#/schema/<type>/<n>` que le graphe a généré pour un autre nœud |
| `E_EPHEMERIS_CYCLE` | des données qui se contiennent elles-mêmes — dans une fonction d'aide, le graphe ou le sérialiseur |
| `E_EPHEMERIS_TOO_DEEP` | une imbrication de plus de 64 niveaux |
| `E_EPHEMERIS_TOO_LONG` | un texte de plus de 10 000 caractères |
| `E_EPHEMERIS_TOO_MANY` | un fil d'Ariane de plus de 32 éléments |

Chacune est une `EphemerisError` avec son `code`.

## Licence

MIT, sauf le vocabulaire schema.org et les types générés depuis lui, qui sont
© les sponsors de schema.org sous Creative Commons Attribution-ShareAlike 3.0 —
voir le NOTICE du paquet.
