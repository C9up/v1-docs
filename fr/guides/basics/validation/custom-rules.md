# Règles personnalisées

Ce guide couvre écrire et tester ses propres règles :

- Règles custom
- Les helpers qu'une règle personnalisée peut réutiliser
- Rappels recevant le champ
- Tester une règle personnalisée

## Règles custom

```typescript
rules.string().custom(
  'slug',
  (v) => typeof v === 'string' && /^[a-z0-9-]+$/.test(v),
  'Doit être un slug valide (lettres minuscules, chiffres, tirets)',
)
```

## Les helpers qu'une règle personnalisée peut réutiliser

`rune.helpers` porte les prédicats qu'utilisent les règles de la chaîne — les
coercitions booléennes, les vérifications de format, les listes de pays. Une
règle personnalisée s'en sert plutôt que de réimplémenter une vérification qui
finirait par diverger de `rules.string().email()`.

```ts
import rune, { createRule } from '@c9up/rune'

const { isSlug, isVAT, getNestedValue, isDistinct, asDate } = rune.helpers

const handle = createRule((value, _options, field) => {
  if (typeof value !== 'string' || !isSlug(value)) {
    field.report('Doit être un slug', 'handle', field)
  }
})
```

Trois d'entre eux méritent une précision :

- **`getNestedValue(key, field)`** lit le **parent** immédiat pour un nom nu, et
  parcourt toute la charge utile pour un chemin pointé. Une règle qui tourne
  dans un item de tableau voit donc ses propres frères avec
  `getNestedValue('price', field)`.
- **`isDistinct(items)`** compare par **identité** — deux objets structurellement
  égaux sont deux items différents. Passez un ou plusieurs noms de champs
  (`isDistinct(rows, 'sku')`) pour comparer là-dessus ; une ligne à laquelle la
  clé manque ne participe pas, mais une ligne dont la clé vaut `null` participe.
- **`isPostalCode` / `isPassportNumber` / `isVAT`** répondent `null` quand rune
  n'a pas de table pour ce pays, au lieu de lever. `null` n'est pas `true` : les
  règles de la chaîne le traitent comme un refus.

`asDate(value, formats?)` analyse avec le même code que `date()` et renvoie une
`Date` native, ou `null`.

## Rappels recevant le champ

`in`, `notIn` et `enum` acceptent un rappel qui reçoit le champ, de sorte qu'une
liste dépendant de la requête est calculée par validation :

```ts
rune.enum((field) => field.meta.admin ? ['member', 'owner'] : ['member'])
rune.string().in((field) => allowedFor(field.meta.tenant))
```

`enum().getChoices()` relit la liste, pour qu'un formulaire affiche exactement
les options que le validateur acceptera — depuis une seule déclaration.

Également : `union().otherwise(cb)` rapporte quand aucune branche n'a matché, et
`record().validateKeys(cb)` contrôle l'ENSEMBLE des clés plutôt que les valeurs.

## Tester une règle personnalisée

Une règle construite avec `createRule` est un objet simple portant un
`run(value, field)` : la tester revient donc à construire le contexte de champ
qu'elle aurait reçu. Se tromper là-dessus revient à tester la règle contre une
forme qu'aucune validation réelle ne produit — les helpers construisent la
vraie.

```typescript
import { createRule } from '@c9up/rune'
import { runRule, runRuleAsync, fieldContext } from '@c9up/rune/testing'

const isEven = createRule((value, _options, field) => {
  if (typeof value !== 'number' || value % 2 !== 0) {
    field.report('Must be even', 'isEven', field)
  }
})

const result = runRule(isEven(), 3)
// { valid: false, errors: [{ field: 'field', rule: 'isEven', … }], value: 3 }
```

`runRule` rend `{ valid, errors, value }` — `value` porte ce que
`field.mutate()` a laissé. Les options façonnent le contexte : `path` (qui
détermine `name` et `wildCardPath`), `data` et `parent` pour une règle qui lit
ses voisines, `meta`, `isValid`.

```typescript
runRule(probe(), 'x', { path: 'tags.0', parent: ['x'] })
// la règle voit name === 0, wildCardPath === 'tags.*'
```

`runRule` refuse une règle asynchrone plutôt que d'annoncer un succès qu'elle
n'a pas attendu — `runRuleAsync` est la forme qui attend, et elle accepte aussi
une règle synchrone. `fieldContext(value, options)` construit un contexte seul,
pour une forme que les options de `runRule` n'expriment pas.
