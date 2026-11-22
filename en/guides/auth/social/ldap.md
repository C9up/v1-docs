# LDAP and Active Directory

This guide covers LDAP and Active Directory:

- An empty password is refused
- A username cannot become a filter
- The connection
- What a directory returns

## LDAP and Active Directory

A directory is a different shape from everything above: nothing is redirected.
The application already holds the credentials, and the directory is the
authority that says whether they are right.

```ts
import { defineConfig, ldap } from '@c9up/transit'

export default defineConfig({
  staff: ldap({
    url: 'ldaps://directory.acme.test',
    baseDn: 'dc=acme,dc=test',
    loginAttribute: 'uid',              // `sAMAccountName` on Active Directory
    bindDn: 'cn=reader,dc=acme,dc=test',
    bindPassword: env.get('LDAP_PASSWORD'),
  }),
})
```

It is reached with `authenticate`, and there is no `begin()` for it:

```ts
const user = await transit.authenticate('staff', username, password)
```

Asking for a directory through `begin()` — or a redirect provider through
`authenticate()` — says which of the two it is, rather than failing on a
missing method.

### An empty password is refused

A simple bind with **no password is an anonymous bind, and the directory
answers success**. A login form that passes a blank password straight through
therefore signs in as whoever was named. It is the oldest bug in LDAP
authentication, and it is refused here before a socket is even opened.

### A username cannot become a filter

There is no filter string in this API. A filter is a structure, and its values
are written as length-prefixed octets — so a login of `*)(uid=admin` is a login
containing those characters, and cannot become syntax. Injection is not escaped
away; it is unrepresentable.

Extra conditions are ANDed with the login:

```ts
ldap({ ...config, filter: { equals: ['objectClass', 'person'] } })
```

### The connection

`ldaps://` unless `allowInsecure` is set, because a simple bind sends the
password exactly as it was typed. Server certificates are checked unless
`rejectUnauthorized: false` says otherwise.

Two connections are used per sign-in: one to find the person's DN, bound as
whatever may search, and one to bind **as** that person — which is what
verifies the password. The second is closed immediately, because a connection
carries the identity of whatever last bound on it.

The search ignores continuation references — the pointers to other servers
that Active Directory returns for any search from a domain root. They are not
counted as entries, and they are never followed: chasing one would send the
next bind wherever the reply pointed. Any other reply the search cannot read
fails the sign-in.

A reply that cannot be framed or decoded at all — malformed BER, an indefinite
length, a message declared larger than 8 MiB — fails the operations waiting on
that connection with an `LdapError` and closes it. It never escapes the socket:
one bad reply from a directory does not take the process down.

### What a directory returns

`user.id` is the DN, the only value a directory guarantees to be unique and
stable. The address, name and nickname are read from the attributes directories
usually use; `claims` names them when yours does not, and
`user.raw.attributes` carries everything — group memberships included, with
every value kept.

An address read from the directory is reported `verified`: the directory is the
one you configured and run. When it belongs to someone else — a customer's
directory — its addresses are that customer's say-so, and linking accounts by
email across tenants on that basis is not safe.
