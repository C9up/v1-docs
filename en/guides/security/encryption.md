# Encryption

This guide covers encryption.

## Encryption

```ts
const token = encryption.encrypt(userId, 3_600_000, 'password-reset')
encryption.decrypt(token, 'password-reset')   // the id
encryption.decrypt(token, 'session')          // null
```

`purpose` is what stops a value sealed for one use being replayed into another —
a reset token presented as a session cookie fails here rather than being
honoured. `expiresIn` is in milliseconds. Both work on `sign()` / `unsign()` too.

The APP_KEY is validated at construction: absent throws `E_MISSING_APP_KEY`,
shorter than 16 characters throws `E_INSECURE_APP_KEY`. A key that appears in
scaffolding and documentation (`change-me`, `secret`, `your-app-key-here`, the
scaffold's placeholder) is refused with `E_INSECURE_APP_KEY` too, at boot: a key
anyone can read lets anyone forge cookies, sessions, CSRF tokens and signed URLs.
Run `ream generate:key` to write a fresh one into `.env`.

Any JSON value can be sealed, not only a string:

```ts
const signed = encryption.sign({ id: 1, roles: ['admin'] })
encryption.unsign<{ id: number; roles: string[] }>(signed)
```

A signed `0`, `false`, `""` or `null` is a real value and comes back as one; a
signed JSON document that is not one of ours is still refused, so widening the
payload did not widen what counts as a valid envelope.

### `verifier`, `child` and `base64`

```ts
encryption.verifier.sign(payload, expiresIn, purpose)   // sign without encrypting
encryption.verifier.unsign<T>(value, purpose)
encryption.algorithm                                    // 'aes-256-gcm'
encryption.base64.encode(value)                         // url-safe, unpadded
encryption.base64.decode(value)                         // null when it does not round-trip

const previous = encryption.child(OLD_APP_KEY)          // key rotation
previous.unsign(cookieStillInTheWild)
```

`child()` is what key rotation is built on: keep the old secret's signer to read
what is already in users' browsers while the new one writes.

> **Cipher.** Ream encrypts with **aes-256-gcm**, where authentication is part
> of the cipher, rather than a CBC cipher plus a hand-assembled HMAC —
> encrypt-then-MAC done by hand is a known source of subtle breaks.
