# Response

This guide covers the response object.

## The response

```ts
ctx.response.onFinish(() => unlink(tempFile))   // after the answer is sent
await ctx.response.stream(fs.createReadStream(path))
ctx.response.attachment(path, 'rapport-échéance.pdf')
ctx.response.cookie('prefs', { theme: 'dark' }, { maxAge: '2h' })
```

- **`onFinish`** runs the work that must happen but must not delay the reply — a
  temp file deleted, a metric recorded. A callback that throws does not stop the
  others: by then the client already has its answer.
- **`maxAge`** takes seconds or a duration string. `'2h'` previously reached the
  header as the invalid `Max-Age=2h`, and the cookie was dropped without a word.
- **`plainCookie`** packs its value as base64url JSON, so an object comes back an
  object and a number a number. Pass `encode: false` for a value a browser script
  must read verbatim, or one that is already protected. Names and values are
  percent-encoded on the way out and decoded on the way in, so
  `request.plainCookie(name, undefined, { encoded: false })` reads back exactly
  what was written, spaces, accents and `;` included.
- **`attachment`** escapes the filename and adds the RFC 6266 extended form, so a
  non-ASCII name survives a Latin-1 header instead of arriving mangled.

`stream()` pushes chunks to the socket as they are read — see
[file uploads](/en/guides/basics/file-uploads#sending-files) for the whole story,
including when a body is buffered instead and what bounds it. The response
crosses a NAPI boundary, so no Node
`ServerResponse` reaches an `onFinish` callback.

### Asking the response what state it is in

```ts
ctx.response.isPending      // nothing sent yet — a middleware can still write
ctx.response.finished       // the answer has gone out
ctx.response.headersSent    // true exactly when finished, see below
ctx.response.hasContent     // a body has been set
ctx.response.hasStream      // the body is a stream still draining
ctx.response.hasLazyBody    // either of the two
ctx.response.setRequestId() // echo the caller's x-request-id back
await ctx.response.finish()  // the terminal step — seal the response
```

`headersSent` equals `finished` here rather than tracking a separate flag:
headers and body cross the NAPI boundary together in one step, so they leave
together.

`finish()` is the terminal step: it is
idempotent, it stamps the request id, and after it nothing more goes into the
response. **The kernel calls it on every response**, error responses included,
so a handler almost never needs to. It returns a promise, and it writes nothing. Ream never owns the socket
— the whole response crosses the NAPI boundary and Rust writes it — so *finish*
here means sealed and ready to hand over rather than flushed. The await is for
a body still being produced by `download()` or a buffered `stream()`; a
streamed body is deliberately not awaited, since it feeds the socket after the
response has been handed over.

`setRequestId()` echoes the `x-request-id` the caller sent. It is what `finish()`
calls, so the echo is a property of the framework rather than something each
handler remembers. Ream already *read* that header into `ctx.id`,
validating its shape and generating one when missing, but never sent it back.
Nothing is echoed when the client sent none: handing back a generated id would
name one the caller never used.
