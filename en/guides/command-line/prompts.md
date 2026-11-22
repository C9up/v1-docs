# Prompts

This guide covers asking questions in a command.

## Asking questions

`this.prompt` covers the whole prompt surface:

```ts
await this.prompt.ask('Model name', { default: 'User' })
await this.prompt.secure('Password', {
  // masked input — one asterisk per character typed
  validate: (value) => (value.length < 6 ? 'At least 6 characters' : true),
})
await this.prompt.confirm('Continue?')
await this.prompt.toggle('Delete everything?', ['Yup', 'Nope'])
await this.prompt.choice('Database', [
  { name: 'pg', message: 'PostgreSQL' },
  { name: 'sqlite', message: 'SQLite' },
])
await this.prompt.multiple('Drivers', ['sqlite', 'mysql', 'pg'])
await this.prompt.autocomplete('Your city', cities, { limit: 10 })
```

Shared options: `default`, `name`, `hint`, `validate` (returns `true` or the
error message), `result` (transforms the returned value), and `format`.

`format` **does not change the returned value**: it only affects
display. Use `result` to transform. (Live echo formatting needs raw mode, so
here `format` only shapes the default that is shown.)

For `choice`, `multiple` and `autocomplete`, `default` is an **index** (or a
list of indexes) — an empty answer selects that option, and the
label shows its name.

`multiple()` receives the **whole selection** in `validate` and `result`, not
each item: the prompt's value *is* the array, and a rule like "at least two"
would otherwise be inexpressible.

```ts
await this.prompt.multiple('Drivers', ['sqlite', 'mysql', 'pg'], {
  validate: (values) => (values.length >= 2 ? true : 'Pick at least two'),
  result: (values) => values.join('+'),
})
```

`result` applies to `confirm` and `toggle` too: the return type follows what the
function returns.

On a non-interactive stdin — CI — a prompt **fails immediately** instead of
waiting for a keypress that will never come.

### Testing an interactive command

Hand the prompt to the kernel and script the answers. Without this, a command
that asks a question is not testable: it would wait on a terminal that is not
there.

```ts
const prompt = new Prompt()
prompt.trap('thing-name').replyWith('Widget')
prompt.trap('overwrite').accept()

const kernel = new Kernel({ prompt }).register(MakeThing)
const command = await kernel.exec('make:thing')

command.exitCode // 0
```

`trap(name)` targets `options.name`, or the message when you give none.
`replyWith`, `accept`, `reject`, `chooseOption(index)`, `chooseOptions([...])`.

A scripted answer goes through the **same validation** as a typed one. If it
fails, the prompt throws: there is nobody to re-ask, and a test injecting a
value the real prompt would refuse gives unearned confidence.

Selection prompts navigate: **↑ ↓** move the pointer, **space** ticks a box on
a `multiple`, **enter** answers, **escape** or **Ctrl-C** cancels. A long list
keeps a window around the cursor, and the pointer wraps at both ends.
`autocomplete` narrows as you type.

A default is an **index**, so the pointer starts there on a `choice` and those
lines come pre-ticked on a `multiple` — pressing enter straight away takes it.

Cancelling is not an empty answer: it throws `E_CONSOLE_PROMPT_CANCELLED`
rather than returning nothing and letting the command carry on.
