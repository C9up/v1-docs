// Runs before the static assets: the zone's "Always Use HTTPS" setting is not
// reachable from here, so the canonical origin is enforced by the Worker.
//
// - http:// and www.reamjs.com answer a permanent redirect to https://reamjs.com,
//   path and query kept;
// - every other response carries Strict-Transport-Security (no `preload`: being
//   on the browsers' preload list is hard to undo).

const CANONICAL_HOST = 'reamjs.com'
const OUR_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`])
const HSTS = 'max-age=31536000; includeSubDomains'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    // Only the production hostnames are redirected: `wrangler dev` on
    // http://localhost and the workers.dev preview keep working as they are.
    if (OUR_HOSTS.has(url.hostname) && (url.protocol !== 'https:' || url.hostname !== CANONICAL_HOST)) {
      url.protocol = 'https:'
      url.hostname = CANONICAL_HOST
      url.port = ''
      return Response.redirect(url.toString(), 301)
    }

    const response = await env.ASSETS.fetch(request)
    if (url.protocol !== 'https:') return response

    const headers = new Headers(response.headers)
    headers.set('Strict-Transport-Security', HSTS)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
}
