# HTTP client

This guide covers outbound HTTP.

## Outbound HTTP

`@c9up/ream/http-client` calls URLs the server does not fully control — a
customer's domain, a webhook target — without letting them point the server at
its own network.

```ts
import { HttpClient } from '@c9up/ream/http-client'

const http = new HttpClient({ userAgent: 'my-app/1.0', timeout: 5000 })
const response = await http.get(`https://${site.domain}/api/posts`)
if (response.ok) render(response.json())
```

Only public addresses are reached. The check runs when the socket connects,
inside the client's own DNS lookup, so a name that resolves to `10.0.0.5`,
`127.0.0.1` or `169.254.169.254` — or one whose DNS answer changes after a
first check — is refused. An address written in the URL is checked on every
redirect hop.

| Option | Default | |
| --- | --- | --- |
| `timeout` | `10000` | One deadline in ms for the whole exchange, redirects included. |
| `maxResponseBytes` | 5 MiB | A larger body fails, declared or streamed. |
| `maxRedirects` | `3` | `0` returns the 3xx itself. |
| `crossHostRedirects` | `false` | Follow a redirect to another host; credentials are dropped on the way. |
| `userAgent` | `@c9up/ream` | |
| `headers` | none | Sent with every request. |
| `allowHosts` | none | `host` or `host:port` exempt from the address rule, e.g. `localhost:4399` in development. |

A redirect from https to http is refused. Every failure is an `HttpClientError`
(a `ReamError`) with a `reason` and a code: `invalidUrl`
(`E_HTTP_CLIENT_INVALID_URL`), `privateAddress` (`E_HTTP_CLIENT_PRIVATE_ADDRESS`),
`unreachable` (`E_HTTP_CLIENT_UNREACHABLE`), `timedOut`
(`E_HTTP_CLIENT_TIMED_OUT`), `tooLarge` (`E_HTTP_CLIENT_TOO_LARGE`) and `redirect`
(`E_HTTP_CLIENT_REDIRECT_REFUSED`). A non-2xx status is a response, not an error.

In tests, `fakeHttp()` returns a client whose transport is replaced by canned
responses; the URL, address, size and redirect rules still apply.

```ts
import { fakeHttp } from '@c9up/ream/http-client'

const http = fakeHttp()
http.on('GET', 'https://cms.example.com/api/posts', { json: [{ id: 1 }] })
await new CmsReader(http).posts()
expect(http.requests).toHaveLength(1)
```
