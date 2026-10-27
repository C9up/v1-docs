# Questionnaire

Une enquête, une question par étape. Il est composé plutôt que réimplémenté : [RadioGroup](/fr/nebula/components/radio-group), [Checkbox](/fr/nebula/components/checkbox), [Input](/fr/nebula/components/input), [Textarea](/fr/nebula/components/textarea), [Progress](/fr/nebula/components/progress) et [Button](/fr/nebula/components/button) existent déjà, si bien que ce composant est la machine à états qui les pilote — quelle question est affichée, ce qui a été répondu, et si le lecteur peut avancer.

Trois décisions le façonnent, chacune avec sa mauvaise réponse évidente. **Le compteur d'étapes est annoncé**, pour qu'un utilisateur de lecteur d'écran ne subisse pas une suite de changements de page inexpliqués. **Les réponses survivent au retour en arrière** : revenir à la question précédente puis repartir garde ce qui a été donné, plutôt que de punir le lecteur d'avoir vérifié. **Une question obligatoire bloque Suivant, et dit pourquoi** — au lieu d'un bouton désactivé en silence — et seulement après une tentative, pour que l'enquête ne s'ouvre pas sur un reproche.

```sh
ream nebula:add questionnaire
```

Organisme · `organisms/Questionnaire.ts` · [Button](/fr/nebula/components/button), [Checkbox](/fr/nebula/components/checkbox), [Input](/fr/nebula/components/input), [Progress](/fr/nebula/components/progress), [RadioGroup](/fr/nebula/components/radio-group), [Textarea](/fr/nebula/components/textarea)

## Utilisation

```ts
import { Questionnaire } from '@c9up/nebula'

Questionnaire({
  questions: [
    { id: 'name', type: 'text', prompt: 'Votre nom ?', required: true },
    {
      id: 'colour',
      type: 'single',
      prompt: 'Couleur préférée ?',
      options: [
        { value: 'red', label: 'Rouge' },
        { value: 'blue', label: 'Bleu' },
      ],
    },
  ],
  onComplete: (answers) => save(answers),
})
```

`onComplete` reçoit `{ name: 'Ada', colour: 'blue' }` — chaque réponse rangée sous l'`id` de sa question.

## Exemples

### Les trois sortes de question

```ts
import type { Question } from '@c9up/nebula'

const questions: Question[] = [
  {
    id: 'plan',
    type: 'single',
    prompt: 'Quelle formule utilisez-vous ?',
    options: [
      { value: 'free', label: 'Gratuite' },
      { value: 'team', label: 'Équipe', description: "Jusqu'à 20 places" },
    ],
  },
  {
    id: 'features',
    type: 'multiple',
    prompt: "Qu'utilisez-vous ?",
    description: "Cochez tout ce qui s'applique.",
    options: [
      { value: 'reports', label: 'Les rapports' },
      { value: 'exports', label: 'Les exports' },
      { value: 'api', label: "L'API" },
    ],
  },
  { id: 'feedback', type: 'text', prompt: 'Autre chose ?', placeholder: 'Facultatif', multiline: true },
]
```

`single` rend un groupe de boutons radio, `multiple` une liste de cases à cocher, `text` un champ — une zone de texte avec `multiline`. Typez la liste en `Question[]` quand elle est déclarée à part de l'appel, pour que chaque objet soit vérifié contre sa propre sorte.

### Obligatoire, et passer

Une question en `required: true` retient le lecteur tant qu'elle n'a pas de réponse : Suivant affiche la raison sous la question au lieu d'avancer. Toute autre question a un bouton Passer à côté de Suivant, qui avance sans rien enregistrer. `skippable: false` retire Passer partout :

```ts
Questionnaire({ questions, skippable: false, onComplete: (answers) => save(answers) })
```

Une réponse texte faite seulement d'espaces compte comme sans réponse ; une question `multiple` a sa réponse dès qu'une case est cochée.

### Lire les réponses

Une réponse est une `string` pour `single` et `text`, et un `readonly string[]` pour `multiple`. Une question jamais répondue n'a aucune entrée. Passer n'enregistre rien et n'efface rien : une réponse donnée avant un retour en arrière garde son entrée, et une réponse vidée par le lecteur reste en `''` ou `[]` :

```ts
import type { Answers } from '@c9up/nebula'

function summarise(answers: Answers): string {
  const features = answers.features
  const count = Array.isArray(features) ? features.length : 0
  return `${answers.plan ?? 'aucune formule'}, ${count} fonctions`
}
```

### Enregistrer au fil de l'eau

`onAnswerChange` est appelé à chaque changement — chaque frappe dans une réponse texte, chaque case cochée — avec l'`id` de la question et la réponse entière :

```ts
Questionnaire({
  questions,
  onAnswerChange: (id, answer) => saveDraft(id, answer),
  onComplete: (answers) => save(answers),
})
```

### Dans une autre langue

```ts
Questionnaire({
  questions,
  onComplete: (answers) => save(answers),
  backLabel: 'Retour',
  nextLabel: 'Suivant',
  skipLabel: 'Passer',
  submitLabel: 'Envoyer',
  progressLabel: 'Progression',
  counterLabel: (position, total) => `Question ${position} sur ${total}`,
})
```

### Sans barre de progression

`showProgress: false` retire la barre, et le compteur avec — pour une enquête de deux questions, ou une enquête placée dans une page qui dit déjà au lecteur où il en est. C'est aussi le compteur qui annonce chaque étape : sans lui, un lecteur d'écran n'apprend rien quand la question change.

```ts
Questionnaire({ questions, showProgress: false, onComplete: (answers) => save(answers) })
```

## API

### Questionnaire

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `questions` | `readonly Question[]` | — | Les questions, dans l'ordre. Lues une fois : la longueur de l'enquête est fixée à sa construction. |
| `onComplete` | `(answers: Answers) => void` | — | Appelé par Envoyer sur la dernière question, ou par Passer à cet endroit. |
| `onAnswerChange` | `(id: string, answer: Answer) => void` | — | Appelé à chaque changement d'une réponse. |
| `skippable` | `boolean` | `true` | Proposer Passer sur les questions non obligatoires. |
| `showProgress` | `boolean` | `true` | La barre de progression et le compteur d'étapes. |
| `backLabel` | `string` | `'Back'` | Le texte du bouton Retour. |
| `nextLabel` | `string` | `'Next'` | Le texte du bouton Suivant. |
| `skipLabel` | `string` | `'Skip'` | Le texte du bouton Passer. |
| `submitLabel` | `string` | `'Submit'` | Ce que dit Suivant sur la dernière question. |
| `progressLabel` | `string` | `'Questionnaire progress'` | Le nom accessible de la barre de progression. |
| `counterLabel` | `(position: number, total: number) => string` | `` `Question ${position} of ${total}` `` | Le compteur sous la barre. |
| `class` | `Reactive<string>` | — | Fusionnée dans les classes de la racine. |

### Question

`Question` vaut `SingleChoiceQuestion | MultipleChoiceQuestion | FreeformQuestion`. Toutes les sortes ont :

| Champ | Type | Description |
|---|---|---|
| `id` | `string` | Clé stable ; la réponse est rangée sous elle. |
| `prompt` | `Child` | La question, rendue comme titre de l'étape. |
| `description` | `Child` | Affichée sous la question. Facultative. |
| `required` | `boolean` | Bloque Suivant tant qu'il n'y a pas de réponse. Facultatif. |

| Sorte | `type` | Champs propres |
|---|---|---|
| `SingleChoiceQuestion` | `'single'` | `options: readonly QuestionOption[]` |
| `MultipleChoiceQuestion` | `'multiple'` | `options: readonly QuestionOption[]` |
| `FreeformQuestion` | `'text'` | `placeholder?: string`, `multiline?: boolean` — une zone de texte au lieu d'un champ |

`QuestionOption` vaut `{ value: string; label: Child; description?: Child }`.

### Answer, Answers

`Answer` vaut `string | readonly string[]` — une valeur pour `single` et `text`, un ensemble pour `multiple`. `Answers` vaut `Readonly<Record<string, Answer>>`, indexé par `id` de question.

### isAnswered

`isAnswered(question: Question, answer: Answer | undefined): boolean` — si une réponse compte pour cette question : une chaîne non vide, ou au moins un choix pour `multiple`. C'est le test qu'applique une question obligatoire.

## Accessibilité

La racine est une `<section>` décrite par le compteur d'étapes, et le compteur est `aria-live="polite"` (l'un et l'autre seulement tant que `showProgress` est actif) : passer à la question suivante annonce « Question 3 of 8 ». La barre est un [Progress](/fr/nebula/components/progress) nommé par `progressLabel`. Chaque question est un `<h2>` ; l'astérisque d'une question obligatoire est `aria-hidden`.

La raison du blocage d'une question obligatoire est un paragraphe `role="alert"`, vide jusqu'à une tentative bloquée, si bien qu'il est annoncé dès qu'il apparaît. Une réponse texte est en plus marquée `aria-invalid` et reliée à ce paragraphe par `aria-describedby`.

Le composant ne gère aucune touche lui-même : le clavier est celui de ses contrôles — les flèches dans le [groupe de boutons radio](/fr/nebula/components/radio-group#accessibilite), <kbd>Espace</kbd> sur une case à cocher, <kbd>Tab</kbd> entre eux et les boutons.

Les textes des boutons, le nom de la barre et le compteur sont des props — voir [langues](/fr/nebula/languages). Le message de blocage lui-même, « This question needs an answer before you can continue. », est figé en anglais : changez-le dans [la source qui vous appartient](/fr/nebula/owning-the-source).
