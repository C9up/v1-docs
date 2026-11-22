# Frameworks

This guide covers the supported frameworks and their components:

- Framework Support
- Framework components

## Framework Support

### React (.tsx)

```tsx
// resources/views/Dashboard.tsx
interface DashboardProps {
  user: { id: string; name: string }
  stats: { orders: number; revenue: number }
}

export default function Dashboard({ user, stats }: DashboardProps) {
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Orders: {stats.orders}</p>
      <p>Revenue: ${stats.revenue}</p>
    </div>
  )
}
```

### Vue (.vue)

```vue
<!-- resources/views/Dashboard.vue -->
<script setup lang="ts">
defineProps<{
  user: { id: string; name: string }
  stats: { orders: number; revenue: number }
}>()
</script>

<template>
  <div>
    <h1>Welcome, {{ user.name }}</h1>
    <p>Orders: {{ stats.orders }}</p>
    <p>Revenue: ${{ stats.revenue }}</p>
  </div>
</template>
```

### Svelte

```svelte
<!-- resources/views/Dashboard.svelte -->
<script lang="ts">
  export let user: { id: string; name: string }
  export let stats: { orders: number; revenue: number }
</script>

<div>
  <h1>Welcome, {user.name}</h1>
  <p>Orders: {stats.orders}</p>
  <p>Revenue: ${stats.revenue}</p>
</div>
```

## Framework components

`@c9up/photon/react`, `@c9up/photon/vue` and `@c9up/photon/svelte` export the
same components, with the same props and slots, for each framework: `usePage`,
`Deferred`, `WhenVisible` and `InfiniteScroll`. Each subpath is imported only by an app of that framework.

```tsx
import { Deferred, InfiniteScroll, WhenVisible } from '@c9up/photon/react'

<Deferred data="stats" fallback={<Spinner />}>
  {({ reloading }) => <Stats stats={stats} dimmed={reloading} />}
</Deferred>

<WhenVisible data="comments" fallback={<p>Loading comments…</p>}>
  <Comments comments={comments} />
</WhenVisible>

<InfiniteScroll data="users" loading={<Spinner />}>
  {users.data.map((user) => <UserRow key={user.id} user={user} />)}
</InfiniteScroll>
```

```vue
<Deferred data="stats">
  <template #fallback><Spinner /></template>
  <template #default="{ reloading }"><Stats :stats="stats" :dimmed="reloading" /></template>
</Deferred>
```

`usePage()` reads the router in the browser. On the server there is no router:
`App` from `createPhotonApp` provides the page. An SSR entry that renders the
page component by hand hands it over itself:

```tsx
// React — resources/ssr.tsx
import { PhotonPage } from '@c9up/photon/react'
return renderToString(
  createElement(PhotonPage, { page: pageData }, createElement(mod.default, pageData.props)),
)

// Vue — resources/ssr.ts
import { PhotonPage } from '@c9up/photon/vue'
const app = createSSRApp({ render: () => h(PhotonPage, { page: pageData }, () => h(Page, pageData.props)) })

// Svelte — PhotonRoot takes the whole page too
svelteRender(PhotonRoot, { props: { component, props: pageData.props, page: pageData } })
```

`Link` is there in the three frameworks too, with the props `href`,
`method`, `data`, `replace`, `only`, `except`, `headers`, `preserveState`, …:
an anchor the router follows, or — for any method but GET — a button. Prefetching is not supported (Photon keeps no visit cache).

```tsx
<Link href="/orders" data={{ status: 'open' }}>Open orders</Link>
<Link href={`/orders/${id}`} method="delete" onSuccess={() => toast('Deleted')}>Delete</Link>
```

`Link`, `Form` and the router also take a **named
route**: `route`, `routeParams`, `qs`, and the route's own method unless
`method` is given. The routes are Ream's, handed to the browser once:

```ts
import { setRoutes, router } from '@c9up/photon/client'
setRoutes(routes) // router.namedRoutes() on the server (paths + methods)

<Link route="users.show" routeParams={{ id: user.id }}>Profile</Link>
<Form route="users.update" routeParams={{ id: user.id }}>…</Form>   // PUT
router.visit({ route: 'users.update', routeParams: { id } }, { data })
```

`router.namedManifest()` works too, every route then a GET. `Form` also takes
`action={{ url, method }}`. Augment `PhotonRoutes` with the map
`router.generateTypes()` writes and names and params type-check:

```ts
declare module '@c9up/photon/client' {
  interface PhotonRoutes extends RouteParams {}
}
```

Photon sets the routes once for the module — they are the application's, the
same on every page. The client entry can use
`resolvePageComponent(name, import.meta.glob('./pages/**/*.tsx'))` to resolve
pages.

Visits other than GET go through the router too — `router.post(url, data)`,
`put`, `patch`, `delete`, or `visit(url, { method, data })`. The data is sent as
JSON, or as multipart as soon as it holds a file (`forceFormData` to insist), with
the `XSRF-TOKEN` cookie echoed as `X-XSRF-TOKEN`. A page that comes back with
validation errors (scoped by `errorBag`) calls `onError` instead of `onSuccess`.
A mutation that fails leaves the page as it is rather than reloading its URL as
a GET.

`useForm` holds a form's data, errors and submission
state — `form.data` and `form.setData` in React, the fields at the top level in
Vue and Svelte (`v-model="form.email"`, `bind:value={form.email}`):

```ts
const form = useForm({ email: '', password: '' })
form.post('/login', { onSuccess: () => form.reset('password') })
// form.errors.email · form.processing · form.isDirty · form.wasSuccessful
// form.recentlySuccessful · form.transform(fn) · form.cancel() · useForm('Login', {...})
```

`<Form>` reads its data from its own fields at submit and gives its children
the same state:

```tsx
<Form action="/login" method="post" resetOnSuccess={['password']}>
  {({ errors, processing }) => (
    <>
      <input name="email" />
      {errors.email && <p>{errors.email}</p>}
      <button disabled={processing}>Log in</button>
    </>
  )}
</Form>
```

Forms have no live validation against the server while the user types, and
upload `progress` stays `null` because the router sends with `fetch`.
