# Questionnaire

A survey, one question per step. It is composed rather than reimplemented: [RadioGroup](/en/nebula/components/radio-group), [Checkbox](/en/nebula/components/checkbox), [Input](/en/nebula/components/input), [Textarea](/en/nebula/components/textarea), [Progress](/en/nebula/components/progress) and [Button](/en/nebula/components/button) already exist, so this component is the state machine over them — which question is showing, what has been answered, and whether the reader may move on.

Three decisions shape it, each with an obvious wrong answer. **The step counter is announced**, so a screen reader user is not left with a series of unexplained page changes. **Answers survive going back**: moving to the previous question and forward again keeps what was given, rather than punishing the reader for checking. **A required question blocks Next, and says why** — instead of a silently disabled button — and only after an attempt, so the survey does not open by scolding.

```sh
ream nebula:add questionnaire
```

Organism · `organisms/Questionnaire.ts` · [Button](/en/nebula/components/button), [Checkbox](/en/nebula/components/checkbox), [Input](/en/nebula/components/input), [Progress](/en/nebula/components/progress), [RadioGroup](/en/nebula/components/radio-group), [Textarea](/en/nebula/components/textarea)

## Usage

```ts
import { Questionnaire } from '@c9up/nebula'

Questionnaire({
  questions: [
    { id: 'name', type: 'text', prompt: 'Your name?', required: true },
    {
      id: 'colour',
      type: 'single',
      prompt: 'Favourite colour?',
      options: [
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' },
      ],
    },
  ],
  onComplete: (answers) => save(answers),
})
```

`onComplete` receives `{ name: 'Ada', colour: 'blue' }` — each answer filed under its question's `id`.

## Examples

### The three kinds of question

```ts
import type { Question } from '@c9up/nebula'

const questions: Question[] = [
  {
    id: 'plan',
    type: 'single',
    prompt: 'Which plan are you on?',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'team', label: 'Team', description: 'Up to 20 seats' },
    ],
  },
  {
    id: 'features',
    type: 'multiple',
    prompt: 'What do you use?',
    description: 'Tick everything that applies.',
    options: [
      { value: 'reports', label: 'Reports' },
      { value: 'exports', label: 'Exports' },
      { value: 'api', label: 'The API' },
    ],
  },
  { id: 'feedback', type: 'text', prompt: 'Anything else?', placeholder: 'Optional', multiline: true },
]
```

`single` renders a radio group, `multiple` a list of checkboxes, `text` an input — a textarea with `multiline`. Type the list as `Question[]` when it is declared apart from the call, so each object is checked against its own kind.

### Required, and skipping

A question with `required: true` keeps the reader on it until it is answered: Next shows the reason under the question instead of moving on. Every other question has a Skip button beside Next, which moves on without recording anything. `skippable: false` removes Skip everywhere:

```ts
Questionnaire({ questions, skippable: false, onComplete: (answers) => save(answers) })
```

A text answer of only spaces counts as unanswered; a `multiple` question is answered once one box is ticked.

### Reading the answers

An answer is a `string` for `single` and `text`, and a `readonly string[]` for `multiple`. A question never answered has no entry at all. Skip records nothing and erases nothing: an answer given before going back keeps its entry, and one cleared by the reader stays as `''` or `[]`:

```ts
import type { Answers } from '@c9up/nebula'

function summarise(answers: Answers): string {
  const features = answers.features
  const count = Array.isArray(features) ? features.length : 0
  return `${answers.plan ?? 'no plan'}, ${count} features`
}
```

### Saving as the reader goes

`onAnswerChange` is called on every change — each keystroke in a text answer, each tick — with the question's `id` and the whole answer:

```ts
Questionnaire({
  questions,
  onAnswerChange: (id, answer) => saveDraft(id, answer),
  onComplete: (answers) => save(answers),
})
```

### In another language

```ts
Questionnaire({
  questions,
  onComplete: (answers) => save(answers),
  backLabel: 'Zurück',
  nextLabel: 'Weiter',
  skipLabel: 'Überspringen',
  submitLabel: 'Absenden',
  progressLabel: 'Fortschritt',
  counterLabel: (position, total) => `Frage ${position} von ${total}`,
})
```

### Without the progress bar

`showProgress: false` removes the bar and the counter with it — for a survey of two questions, or one shown inside a page that already says where the reader is. The counter is also what announces each step, so without it a screen reader is told nothing when the question changes.

```ts
Questionnaire({ questions, showProgress: false, onComplete: (answers) => save(answers) })
```

## API

### Questionnaire

| Prop | Type | Default | Description |
|---|---|---|---|
| `questions` | `readonly Question[]` | — | The questions, in order. Read once: the survey's length is fixed when it is built. |
| `onComplete` | `(answers: Answers) => void` | — | Called by Submit on the last question, or by Skip there. |
| `onAnswerChange` | `(id: string, answer: Answer) => void` | — | Called on every change to an answer. |
| `skippable` | `boolean` | `true` | Offer Skip on questions that are not required. |
| `showProgress` | `boolean` | `true` | The progress bar and the step counter. |
| `backLabel` | `string` | `'Back'` | The Back button's text. |
| `nextLabel` | `string` | `'Next'` | The Next button's text. |
| `skipLabel` | `string` | `'Skip'` | The Skip button's text. |
| `submitLabel` | `string` | `'Submit'` | What Next says on the last question. |
| `progressLabel` | `string` | `'Questionnaire progress'` | The progress bar's accessible name. |
| `counterLabel` | `(position: number, total: number) => string` | `` `Question ${position} of ${total}` `` | The counter under the bar. |
| `class` | `Reactive<string>` | — | Merged into the root's classes. |

### Question

`Question` is `SingleChoiceQuestion | MultipleChoiceQuestion | FreeformQuestion`. Every kind has:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable key; the answer is filed under it. |
| `prompt` | `Child` | The question, rendered as the step's heading. |
| `description` | `Child` | Shown under the prompt. Optional. |
| `required` | `boolean` | Blocks Next until answered. Optional. |

| Kind | `type` | Own fields |
|---|---|---|
| `SingleChoiceQuestion` | `'single'` | `options: readonly QuestionOption[]` |
| `MultipleChoiceQuestion` | `'multiple'` | `options: readonly QuestionOption[]` |
| `FreeformQuestion` | `'text'` | `placeholder?: string`, `multiline?: boolean` — a textarea instead of an input |

`QuestionOption` is `{ value: string; label: Child; description?: Child }`.

### Answer, Answers

`Answer` is `string | readonly string[]` — a value for `single` and `text`, a set for `multiple`. `Answers` is `Readonly<Record<string, Answer>>`, keyed by question `id`.

### isAnswered

`isAnswered(question: Question, answer: Answer | undefined): boolean` — whether an answer counts for that question: a non-blank string, or at least one choice for `multiple`. It is the test a required question applies.

## Accessibility

The root is a `<section>` described by the step counter, and the counter is `aria-live="polite"` (both only while `showProgress` is on): moving to the next question announces "Question 3 of 8". The bar is a [Progress](/en/nebula/components/progress) named by `progressLabel`. Each prompt is an `<h2>`; the asterisk on a required one is `aria-hidden`.

The reason a required question blocks is a `role="alert"` paragraph, empty until a blocked attempt, so it is announced the moment it appears. A text answer is also marked `aria-invalid` and pointed at that paragraph through `aria-describedby`.

The component handles no key of its own: the keyboard is that of its controls — arrow keys in the [radio group](/en/nebula/components/radio-group#accessibility), <kbd>Space</kbd> on a checkbox, <kbd>Tab</kbd> between them and the buttons.

The button texts, the bar's name and the counter are props — see [languages](/en/nebula/languages). The blocking message itself, "This question needs an answer before you can continue.", is fixed in English: change it in [the source you own](/en/nebula/owning-the-source).
