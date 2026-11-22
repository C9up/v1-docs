# Templates

This guide covers server-side templates with inker:

- Architecture — Rust parses, Node evaluates
- File convention
- Interpolation & expressions
- Control flow
- Debugging — `@eval` / `@dump`
- HTML-escape vs raw
- Strict-by-default

Inker is the server-side templating module in the Ream ecosystem (`@c9up/inker`). Templates use `@` directives, `{{ }}` interpolation, and layouts / sections / components / slots — parsed by a Rust lexer + parser and rendered by a Node evaluator.

> Status: complete. `{{ }}` interpolation evaluates real JavaScript expressions; `@if`/`@elseif`/`@else`/`@unless`, `@each`, `@let`, `@layout` + `@section`/`@super`, `@include`/`@includeIf`, `@component` + `@slot` with `$props`/`$slots`, core globals, registered helpers, `@eval`/`@dump`, and custom tags (`registerTag`) all ship. The Ream provider and the agnostic `@c9up/inker/testing` sub-path are wired.

## Architecture — Rust parses, Node evaluates

Inker pulls in no templating dependency. It is hand-rolled, split across a Rust core and a Node renderer:

- **Rust (`inker-engine`)** — a single forward-scan lexer and a linear parser turn a `.inker` source into a **JSON AST** (`parseTemplate` over NAPI, serialised by `astToJson`). This is the CPU-bound work; each node carries the *verbatim source* of its expressions. The binary's third call, `openedPath`, gives the system path of an open template file, so the loader can check that the file it actually opened lies inside the templates root (Linux reads `/proc/self/fd` instead).
- **Node (`renderNode.ts`)** — walks the JSON AST and evaluates each expression's source in Node's own **V8**, with the registered helpers, core globals, and the render scope all in lexical scope (one runtime; helpers are plain functions callable anywhere, including inside arrow functions and loop-scoped arguments).

> The expression source is author-controlled (`.inker` files) — the same trust level as the rest of the app's code. That is why a helper can be called *inside* a rich expression (`{{ users.filter(u => can(u)).map(u => u.name).join(', ') }}`).

> **Trust boundary (security).** Because expressions run in V8, a template *is code*. Never feed untrusted input to `renderString`, and never load `.inker` templates from an untrusted source (a CMS field, a user upload) — that is arbitrary code execution. As a hardening measure, the dangerous Node globals — `process`, `globalThis`, `global`, `require`, `module`, `exports`, `Function`, `eval` — are shadowed to `undefined` in the expression scope, so `{{ process.env.SECRET }}` or `@eval(require('child_process')…)` fail. This is **not** a sandbox: a determined property-chain escape (`({}).constructor.constructor(…)`) is not blocked. Treat templates as trusted code.

This keeps the package zero-runtime-dep, agnostic by construction, and free of any embedded JS VM (an earlier QuickJS spike was dropped: two runtimes meant a crash-prone FFI bridge, and V8-in-Node is both simpler and faster).

## File convention

Templates live as `<root>/<name>.inker` files. The caller resolves the root once (absolute path) and passes it at construction. There is no implicit search path, no auto-resolution against `process.cwd()`, no `~` expansion — explicit beats implicit:

```ts
import path from 'node:path'
import { Templates } from '@c9up/inker'

const templates = new Templates({
  root: path.join(process.cwd(), 'resources/templates'),
})

const html = await templates.render('invoice', {
  customer: { name: 'Alice' },
  total: 42,
})
```

The constructor throws `InkerRenderError({ code: 'E_INKER_INVALID_PATH' })` if `root` is relative, missing, or points at a file rather than a directory.

### Checking a template without rendering it

`compile(name)` and `compileRaw(source, name?)` parse and stop — the syntax
check a linter, a CI step, or an editor integration wants. They throw an
`InkerRenderError` carrying `code`, `line` and `column`, and return nothing when
the template is valid. Rendering is not a substitute: it needs data and it runs
the template's expressions.

```ts
try {
  templates.compile('invoice')
} catch (error) {
  console.error(error.code, error.context.line)
}
```

> **Why nothing is returned:** inker's compiler is in Rust and produces an opaque native AST
> handle, which means nothing on this side of the bridge — so these report
> whether the template parses rather than handing back an artifact.

## Interpolation & expressions

Output comes in two forms:

```inker
<!-- Escaped (HTML-safe by default — defends against stored XSS) -->
<h1>Hello {{ customer.name }}</h1>

<!-- Raw / unescaped (use deliberately for pre-trusted HTML fragments) -->
<div>{{{ richBody }}}</div>
```

The `expr` between braces is a **full JavaScript expression**, evaluated in V8 with helpers, globals, and the render scope in scope:

```inker
{{ n > 1 ? n * 2 : 0 }}
{{ items.map(i => i.title).join(', ') }}
{{ users.filter(u => u.active).length }}
{{ truncate(post.body, 120) }}
{{ customer?.address?.city ?? 'n/a' }}
```

A value that is a `SafeString` is emitted raw (even in the escaped `{{ }}` form); `null` / `undefined` render as the empty string; any other value prints through `String(value)` (numbers without a trailing `.0`, `-0` → `0`; a `Date`, an array or an object with its own `toString()` print the way JavaScript prints them), and `{{ }}` escapes that string. A name the render data does not carry reads as `undefined`, so optional data is guarded with `@if(errors)` and prints as the empty string; navigating into it (`{{ missing.name }}`) throws `E_INKER_UNKNOWN_IDENTIFIER` with the source position.

### Escape characters, comments, whitespace

Use `\{{` / `\}}` to emit literal braces (the backslash is consumed). Template comments are supported and stripped entirely — they emit nothing, and their contents are never parsed:

```inker
Use \{{ name \}} to interpolate.     →   Use {{ name }} to interpolate.
{{-- this note, and any {{ x }} inside it, is stripped --}}
```

An unterminated `{{--` is a hard lex error, so a stray comment open cannot silently swallow the rest of a template.

## Control flow

Block tags: `@if` / `@elseif` / `@else` / `@endif`, its negation `@unless`, and `@each` / `@endeach`:

```inker
@if(cart.items.length > 0)
  <p>{{ cart.items.length }} item(s)</p>
@elseif(cart.savedForLater.length)
  <p>Nothing in the cart, but you have saved items.</p>
@else
  <p>Your cart is empty.</p>
@endif

@unless(user.verified)
  <banner>Please verify your email.</banner>
@endunless
```

Every block also closes with the generic `@end`, which closes whatever block is innermost (`@if(x)…@end`, `@each(…)…@end`, `@component(…)…@end`, `@slot(…)…@end`, custom block tags). Ending a tag line with `~` (`@if(x)~`, `@end~`) drops the line break that leads into the next line of output, so a loop can emit `<li>`s with no newline between them.

Line breaks follow a fixed line model:

- A tag written at the start of its line (indentation allowed, and dropped) produces no line break of its own. The line break before a content line is kept; the one before a tag line is kept only when the previous line was also a tag line; a closing tag line never has one.
- `@let`, `@assign`, `@eval`, `@inject`, `@slot`, `@pushTo`, `@pushOnceTo`, `@debugger`, `@newError` and `@layout` also drop the next line break, as does a registered tag declared with `noNewLine: true`.
- A component's default slot ignores its first line break. A page loses one line break at its very start and one at its very end; partials and components keep theirs.
- A stack joins the contents pushed to it with a line break.
- A tag written in the middle of a line is still a tag: it leaves the line's line breaks alone.

`@each` iterates arrays, strings (one character per code point), objects (every own key), `Map`s, and `Set`s, with an optional `@else` for the empty case:

```inker
@each(item in cart.items)
  <li>{{ item.title }} — {{ item.price }}</li>
@else
  <li>empty</li>
@endeach

@each((value, key) in settings)
  <tr><td>{{ key }}</td><td>{{ value }}</td></tr>
@endeach
```

`(value, index)` binds the element and its position (numeric index for arrays/Sets, property key for objects). Iterating a `null`/`undefined` value throws `E_INKER_INVALID_ITERABLE` and points you at wrapping the loop in `@if()`.

`@let` adds a block-scoped binding for every sibling that follows it, evaluated as a full JavaScript expression:

```inker
@let(total = cart.items.reduce((s, i) => s + i.price, 0))
<p>Total: {{ total }}</p>
```

It also supports object and array destructuring, including rename, defaults, and rest:

```inker
@let({ name, email } = user)
@let([first, second, ...rest] = items)
@let({ role = 'guest' } = session)
<p>{{ name }} — {{ role }}</p>
```

Binding names are validated at parse time: an invalid identifier, a reserved word, or a prototype-pollution key (`__proto__`/`constructor`/`prototype`) raises `E_INKER_INVALID_EXPRESSION` before the template renders.

## Debugging — `@eval` / `@dump`

`@eval(expr)` evaluates an expression for its side effects and emits nothing; `@dump(expr)` pretty-prints a value inside a `<pre class="inker-dump">` for debugging:

```inker
@eval(logger.debug('rendering invoice'))
@dump(invoice)
```

## HTML-escape vs raw

```inker
{{ comment.body }}     <!-- xss-safe by default -->
{{{ comment.body }}}   <!-- explicit raw output -->
```

The escape map covers the HTML-context set plus the two JS line-separator code points (which can break inline `<script>` context):

| Char        | Escapes to  |
|-------------|-------------|
| `&`         | `&amp;`     |
| `<`         | `&lt;`      |
| `>`         | `&gt;`      |
| `"`         | `&quot;`    |
| `'`         | `&#39;`     |
| `` ` ``     | `&#96;`     |
| U+2028      | `&#x2028;`  |
| U+2029      | `&#x2029;`  |

`null` and `undefined` coerce to the empty string in both escape and raw modes — no `"null"` / `"undefined"` strings ever bleed into the output. A `SafeString` returned by a helper (or an expression) is emitted raw even inside `{{ }}`.

## Strict-by-default

Inker shares the framework posture established by Atlas, Rune, and Warden: misconfiguration throws loud, descriptively, immediately.

- Missing templates throw — they do not return `null`.
- Navigating into a missing value (`{{ order.customer.name }}` with no `customer`) throws with the source position — it does not render blank.
- Invalid root paths throw at construction — they do not lazy-fail at first render.
- Parse errors throw with line + column — they do not best-effort partial render.

The trade-off is fewer "blank invoice" production bugs at the cost of more discipline up front; for the framework's data-rendering surface (admin pages, invoices, emails), this is the right side of the trade.
