# Migrating from AdonisJS

Ream follows the AdonisJS v7 SDK, but it is not a drop-in replacement. This
page is the complete list of what a migration has to know: everywhere Ream
deliberately answers differently, why, and what you have to change.

Anything not listed here is meant to behave as upstream does. If it does not,
that is a bug — report it.

## It logs your users out once

**Encryption.** Cookies are encrypted with AES-256-GCM, which is what upstream
configures by default now; the CBC + HMAC construction survives there as the
`legacy` driver. A cookie written by an application using that older format
cannot be decrypted here, so every signed-in user is signed out once, at
deploy. Plan the cutover for a quiet hour.

## It changes what your code must say

**`query.pojo()` must end the chain.** Upstream's `pojo()` is a flag on the
builder, so the builder stays available after it. Here it returns a terminal
view: awaitable for the rows, and chainable into `first()`. Move `.pojo()` to
the end — `query.where(...).orderBy(...).pojo()`. A chain in the old order
fails to compile, so nothing changes silently.

**A custom naming strategy returns the ATTRIBUTE.** `relationForeignKey`
answers with the model property (`userId`), and Atlas derives the column by
running it through the same strategy's `columnName()` — the same shape
upstream uses. A strategy ported from upstream needs no change; one written
against an earlier Ream release, returning `user_id`, does.

**`number()` refuses an empty string.** Upstream runs it through `Number("")`,
which is `0`, so an untouched text input silently becomes a quantity of zero
and no later rule can tell that from someone typing "0". Use `.optional()` to
accept the field being absent.

**Inker compiles a custom tag at render.** Edge emits JavaScript and runs
`compile` once; Inker parses in Rust and renders by walking the AST, so
`compile` runs per render. The authoring model is the same. Only inline tags
(`block: false`) are supported so far.

**Some capabilities are optional peers.** Install them only if you use the
feature: `vite` for server rendering in development (Photon), `ical-generator`
for `icalEvent(callback)` (Rover). Without them, the feature is off rather than
broken.

## It answers differently in one small place

**`request.cookie(name, fallback)` keeps an empty string.** Upstream falls back
with `||`, so a cookie deliberately written as `""` reads back as the default.
A cleared preference is a value someone wrote. Upstream's own doc-comment on
that line describes `??`, which is what this does.

## It refuses what upstream accepts

These reject input upstream would let through. Each is deliberate.

- **Rune** refuses a `__proto__` key. Upstream's compiler emits a `for…in` copy
  that assigns straight into the output, replacing its prototype.
- **Relay** refuses a subscription by default; you opt in per channel.
- **Inker** hides the template globals that let a template reach the process.
- **An upload that would overwrite an existing file fails atomically.** Upstream
  checks then renames, so two uploads landing on the same name can both
  succeed and one silently wins.

## NAPI boundaries

The HTTP layer runs in Rust, and two things follow from that:

- **Multipart uploads are held in memory.** There is no temporary file, so
  `multipart.tmpDir` is refused at construction and there is no
  `E_MISSING_FILE_TMP_PATH` — nothing can be missing.
- **`onFinish` receives no `ServerResponse`.** The response object never
  crosses the boundary.

## Packages with no upstream counterpart

`atom`, `chronos`, `comet`, `eon`, `nebula`, `nova`, `photon`, `ream-mcp`,
`station`, `transit` and `vellum` have no one-to-one AdonisJS equivalent. They
are outside the parity comparison entirely — nothing here is measured against
an upstream package that does not exist.
