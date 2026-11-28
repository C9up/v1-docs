# Modèles de langage

Ce guide explique comment appeler un modèle de langage depuis votre application :

- Configurer les fournisseurs
- Envoyer une requête
- Recevoir une réponse en stream
- Outils et sortie structurée
- Une clé par appel
- Limites et annulation
- Claude

## Vue d'ensemble

`@c9up/polaris` donne à votre application une seule façon d'appeler un modèle
de langage. Vous envoyez la même requête et lisez la même réponse, quel que soit
le fournisseur. Changer de fournisseur se fait dans la config, pas dans votre
code.

Cette version fournit Claude. Le fournisseur suivant sera compatible avec l'API
d'OpenAI : il servira pour Groq, Cloudflare Workers AI, un serveur Ollama local
et les autres services qui parlent cette API.

Installez le paquet, et le SDK Anthropic pour Claude :

```bash
pnpm add @c9up/polaris @anthropic-ai/sdk
```

Déclarez le provider dans `reamrc.ts` :

```ts
providers: [() => import('@c9up/polaris/provider')]
```

## Configurer les fournisseurs

Déclarez vos fournisseurs dans `config/polaris.ts`. Chacun a un nom, et l'un
d'eux est celui par défaut :

```ts
import { defineConfig, type InferProviders, providers } from '@c9up/polaris'
import env from '#start/env'

const polarisConfig = defineConfig({
  default: 'claude',
  providers: {
    claude: providers.anthropic({
      model: 'claude-opus-5-5',
      apiKey: env.get('ANTHROPIC_API_KEY'),
    }),
  },
})

export default polarisConfig

declare module '@c9up/polaris/types' {
  interface ProvidersList extends InferProviders<typeof polarisConfig> {}
}
```

Le bloc `declare module` permet à TypeScript de vérifier les noms de
fournisseurs : `polaris.use('claude')` compile, un nom mal écrit ne compile pas.

Un fournisseur est construit la première fois que vous l'utilisez. Si sa config
est fausse, l'erreur arrive à ce moment-là, avec le champ en cause.

## Envoyer une requête

```ts
import polaris from '@c9up/polaris/services/main'

const reply = await polaris.use('claude').chat({
  system: 'Répondez en une phrase, en langage simple.',
  messages: [{ role: 'user', content: "Qu'est-ce qu'un frontalier ?" }],
})

reply.text // le texte de la réponse
reply.stopReason // 'end' quand la réponse est complète
reply.usage // jetons d'entrée, de sortie et de cache
```

`polaris.chat()` sans `use()` s'adresse au fournisseur par défaut.

Une conversation, c'est la liste de ses messages. Pour la poursuivre, ajoutez la
réponse et la question suivante, puis renvoyez toute la liste :

```ts
const next = await polaris.chat({
  messages: [
    { role: 'user', content: "Qu'est-ce qu'un frontalier ?" },
    reply.message,
    { role: 'user', content: 'De quel permis a-t-il besoin ?' },
  ],
})
```

Renvoyez `reply.message` tel quel. Certains fournisseurs, dont Claude, vérifient
que l'historique reçu est exactement celui qu'ils ont envoyé ; polaris garde
dans chaque partie de la réponse ce qu'il leur faut pour cela.

Vérifiez `stopReason` avant d'utiliser une réponse :

| `stopReason` | Ce que cela veut dire |
|---|---|
| `end` | La réponse est complète. |
| `max_tokens` | La réponse a été coupée à la limite de sortie. Augmentez `maxTokens`, ou passez en stream. |
| `tool_use` | Le modèle vous demande d'exécuter des outils. Voir plus bas. |
| `refusal` | Le fournisseur a refusé de répondre. Le texte peut être vide. |
| `pause` | Le fournisseur a mis en pause un long tour. Renvoyez la réponse pour qu'il continue. |

## Recevoir une réponse en stream

Un stream vous donne la réponse au fil de son écriture :

```ts
for await (const event of polaris.stream({ messages })) {
  if (event.type === 'text') process.stdout.write(event.text)
  if (event.type === 'done') console.log(event.response.usage)
}
```

Le stream se termine par un seul événement `done`. Il contient la réponse
entière, celle que `chat()` aurait renvoyée. Si vous quittez la boucle avant la
fin, polaris annule la requête au fournisseur : vous ne payez plus une réponse
que personne ne lit.

## Outils et sortie structurée

Un outil est une fonction que le modèle peut vous demander d'exécuter. Vous la
décrivez par un JSON Schema ; quand le modèle en a besoin, la réponse s'arrête
avec `stopReason: 'tool_use'` et liste les appels dans `toolCalls` :

```ts
const lookup = {
  name: 'canton_rule',
  description: "Cherche une règle fiscale d'un canton suisse",
  inputSchema: {
    type: 'object',
    properties: { canton: { type: 'string' } },
    required: ['canton'],
  },
}

const first = await polaris.chat({ messages, tools: [lookup] })

for (const call of first.toolCalls) {
  // call.input est ce que le modèle a écrit : vérifiez-le avant de l'utiliser.
  const answer = await findRule(call.input)
  messages.push(first.message, {
    role: 'user',
    content: [{ type: 'tool_result', toolCallId: call.id, content: answer }],
  })
}

const final = await polaris.chat({ messages, tools: [lookup] })
```

Pour obtenir une seule valeur JSON plutôt que du texte, donnez un schéma de
sortie :

```ts
const reply = await polaris.chat({
  messages,
  output: {
    name: 'profile',
    schema: {
      type: 'object',
      properties: { canton: { type: 'string' }, borderCommuter: { type: 'boolean' } },
      required: ['canton', 'borderCommuter'],
    },
  },
})

const profile = JSON.parse(reply.text)
```

Ce que produit le modèle n'est pas une entrée de confiance : validez
`call.input` et le JSON analysé avant d'agir dessus.

Si un fournisseur ne sait pas exécuter d'outils, lire d'images ou produire une
sortie structurée, polaris refuse la requête avec `E_POLARIS_UNSUPPORTED` avant
d'envoyer quoi que ce soit.

## Une clé par appel

Quand chaque compte de votre application apporte sa propre clé de fournisseur,
passez-la avec l'appel :

```ts
await polaris.use('claude').chat(request, { apiKey: account.llmKey })
```

Elle remplace la clé configurée pour cet appel seulement. Si l'erreur du
fournisseur mentionne la clé, polaris la remplace par `E_POLARIS_PROVIDER_FAILED` :
son message a la clé retirée, et l'erreur d'origine n'est pas jointe, si bien
que la clé n'arrive pas dans vos journaux.

## Limites et annulation

Chaque appel a un délai, 10 minutes par défaut, streams compris. Changez-le dans
la config avec `timeout`, ou pour un seul appel :

```ts
await polaris.chat(request, { timeout: 30_000 })
```

polaris lit au plus 32 Mio chez un fournisseur (`maxResponseBytes`). Il compte
les octets réellement reçus : une réponse compressée ou découpée ne peut pas
dépasser la limite.

Passez un `signal` pour annuler vous-même un appel :

```ts
await polaris.chat(request, { signal: AbortSignal.timeout(5_000) })
```

Un appel qui manque de temps lève `E_POLARIS_TIMEOUT`. Un appel que vous avez
annulé est rejeté avec la raison de votre signal.

Quand le fournisseur est occupé, la requête est retentée avant que polaris
abandonne (deux fois par défaut pour Claude). Les nouvelles tentatives restent
dans le délai de l'appel. Une fois épuisées, vous recevez `E_POLARIS_RATE_LIMITED`
ou `E_POLARIS_PROVIDER_UNAVAILABLE`. Ces deux erreurs répondent HTTP 503 si elles
atteignent votre gestionnaire d'exceptions ; une clé de fournisseur refusée
(`E_POLARIS_AUTHENTICATION`) répond 502, jamais 401, car le problème vient de la
clé de votre serveur, pas de la requête du visiteur.

## Claude

`providers.anthropic()` utilise le SDK officiel d'Anthropic. Installez-le à côté
de polaris ; il est chargé la première fois que le fournisseur sert.

```ts
claude: providers.anthropic({
  model: 'claude-opus-5-5',
  apiKey: env.get('ANTHROPIC_API_KEY'),
  fallbacks: 'default',
})
```

`fallbacks: 'default'` permet à l'API de relancer une requête sur un modèle de
repli quand le modèle la refuse. C'est recommandé sur les modèles Opus, Sonnet
et Fable récents. Les autres options sont dans la
[référence](/fr/reference/polaris#driver-claude).

Les champs que polaris ne modélise pas peuvent être envoyés tels qu'ils s'écrivent
dans l'API Messages, sous `providerOptions.anthropic` :

```ts
await polaris.chat({
  messages,
  providerOptions: { anthropic: { thinking: { type: 'adaptive', display: 'summarized' } } },
})
```

Le raisonnement de Claude revient en parties `reasoning`. Leur texte peut être
vide : Claude ne le montre pas toujours.

## Pour aller plus loin

- [Référence polaris](/fr/reference/polaris) : toutes les options, tous les types et toutes les erreurs.
- [Erreurs](/fr/reference/errors#erreurs-polaris) : les codes `E_POLARIS_*`.
