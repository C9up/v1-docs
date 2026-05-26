# Rune — Validation

Rune est le moteur de validation de Ream. Définissez des schémas avec des règles fluent, validez les données d'entrée, et recevez des messages d'erreur structurés.

## Utilisation basique

```typescript
import { rules, schema } from '@c9up/rune'

const CreateOrderSchema = schema({
  total: rules.number().positive(),
  customerName: rules.string().min(3).max(100).trim(),
  email: rules.string().email(),
})

const result = CreateOrderSchema.validate({
  total: 42.50,
  customerName: '  Alice  ',
  email: 'alice@example.com',
})

// result.valid === true
// result.data === { total: 42.50, customerName: 'Alice', email: 'alice@example.com' }
```

## Règles

### Règles de type

```typescript
rules.string()    // Doit être une string
rules.number()    // Doit être un nombre (NaN rejeté)
rules.boolean()   // Doit être un booléen
rules.any()       // Pas de vérification de type — chaîne vide
```

### Règles string

```typescript
rules.string()
  .min(3)         // Longueur minimale
  .max(100)       // Longueur maximale
  .email()        // Doit être un email valide
  .trim()         // Supprimer les espaces (transformation)
```

### Règles number

```typescript
rules.number()
  .min(0)         // Valeur minimale
  .max(1000)      // Valeur maximale
  .positive()     // Doit être > 0
```

### Champs optionnels

```typescript
const s = schema({
  name: rules.string().min(1),
  nickname: rules.string().optional(),  // undefined/null accepté
})

s.validate({ name: 'Alice' })  // valid — nickname est optionnel
```

### Règles custom

```typescript
rules.string().custom(
  'slug',
  (v) => typeof v === 'string' && /^[a-z0-9-]+$/.test(v),
  'Doit être un slug valide (lettres minuscules, chiffres, tirets)',
)
```

### Messages d'erreur personnalisés

```typescript
rules.string()
  .min(3)
  .message('Le nom doit faire au moins 3 caractères')
  .email()
  .message('Veuillez entrer une adresse email valide')
```

La méthode `.message()` remplace le message de la **dernière** règle ajoutée.

## Résultat de validation

```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  data?: Record<string, unknown>  // Présent uniquement quand valid
}

interface ValidationError {
  field: string    // Nom du champ
  rule: string     // Règle qui a échoué (ex: 'min', 'email', 'required')
  message: string  // Message lisible
}
```

## Transformations

Les transformations modifient la valeur **avant** l'exécution des règles de validation :

```typescript
const s = schema({
  name: rules.string().trim().min(3),
})

s.validate({ name: '  Al  ' })
// Trim vers 'Al', puis min(3) échoue
// errors: [{ field: 'name', rule: 'min', message: 'Minimum 3' }]
```

## Dans les handlers de route

```typescript
router.post('/orders', async (ctx) => {
  const result = CreateOrderSchema.validate(JSON.parse(ctx.request!.body))

  if (!result.valid) {
    ctx.response!.status = 400
    ctx.response!.body = JSON.stringify({ errors: result.errors })
    return
  }

  // result.data contient les données validées + transformées
  ctx.response!.status = 201
  ctx.response!.body = JSON.stringify({ order: result.data })
})
```

## Internationalisation (i18n)

Rune n'embarque plus de moteur i18n interne.

Utilisez Rosetta comme module i18n unique de l'ecosysteme.

### Brancher Rosetta dans Rune

```typescript
import { Rosetta } from '@c9up/rosetta'
import { bindRosetta } from '@c9up/rune'

const i18n = new Rosetta({ defaultLocale: 'fr', fallbackLocale: 'en' })
  .loadMessages('fr', { 'validation.required': '{field} est requis' })

bindRosetta(i18n)
```

```typescript
import { Rosetta } from '@c9up/rosetta'

const i18n = new Rosetta({ defaultLocale: 'en', fallbackLocale: 'en' })

// Enregistrer les traductions d'une locale
i18n.loadMessages('fr', {
  'validation.required': 'Le champ :field est requis',
  'validation.min': 'Le champ :field doit avoir au moins :min caractères',
  'validation.email': 'Le champ :field doit être un email valide',
})

i18n.loadMessages('es', {
  'validation.required': 'El campo :field es obligatorio',
  'validation.min': 'El campo :field debe tener al menos :min caracteres',
})
```

### Traduire des messages

```typescript
// Définir la locale active
i18n.setLocale('fr')

// Traduire une clé avec des paramètres
i18n.t('validation.required', { field: 'nom' })
// 'Le champ nom est requis'

i18n.t('validation.min', { field: 'mot de passe', min: '8' })
// 'Le champ mot de passe doit avoir au moins 8 caractères'
```

## Étapes suivantes

- [Atlas (ORM)](/fr/modules/atlas) — Valider avant de sauvegarder les entités
- [Warden (Auth)](/fr/modules/warden) — Authentifier les utilisateurs
