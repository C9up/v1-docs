# Frameworks

Ce guide couvre les frameworks pris en charge et leurs composants :

- Support des frameworks
- Composants par framework

## Support des frameworks

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
      <h1>Bienvenue, {user.name}</h1>
      <p>Commandes : {stats.orders}</p>
      <p>Revenus : ${stats.revenue}</p>
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
    <h1>Bienvenue, {{ user.name }}</h1>
    <p>Commandes : {{ stats.orders }}</p>
    <p>Revenus : ${{ stats.revenue }}</p>
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
  <h1>Bienvenue, {user.name}</h1>
  <p>Commandes : {stats.orders}</p>
  <p>Revenus : ${stats.revenue}</p>
</div>
```

## Composants par framework

`@c9up/photon/react`, `@c9up/photon/vue` et `@c9up/photon/svelte` exportent les
mêmes composants, avec les mêmes props et slots, pour chaque framework :
`usePage`, `Deferred`, `WhenVisible` et `InfiniteScroll`. Chaque sous-chemin n'est importé que par une app de ce
framework.

```tsx
import { Deferred, InfiniteScroll, WhenVisible } from '@c9up/photon/react'

<Deferred data="stats" fallback={<Spinner />}>
  {({ reloading }) => <Stats stats={stats} dimmed={reloading} />}
</Deferred>

<WhenVisible data="comments" fallback={<p>Chargement des commentaires…</p>}>
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

`usePage()` lit le routeur dans le navigateur. Côté serveur il n'y a pas de
routeur : l'`App` de `createPhotonApp` fournit la page. Une entrée SSR qui rend
le composant de page à la main la transmet elle-même :

```tsx
// React — resources/ssr.tsx
import { PhotonPage } from '@c9up/photon/react'
return renderToString(
  createElement(PhotonPage, { page: pageData }, createElement(mod.default, pageData.props)),
)

// Vue — resources/ssr.ts
import { PhotonPage } from '@c9up/photon/vue'
const app = createSSRApp({ render: () => h(PhotonPage, { page: pageData }, () => h(Page, pageData.props)) })

// Svelte — PhotonRoot prend aussi la page entière
svelteRender(PhotonRoot, { props: { component, props: pageData.props, page: pageData } })
```

`Link` est aussi là dans les trois frameworks, avec les props
`href`, `method`, `data`, `replace`, `only`, `except`, `headers`,
`preserveState`, … : une ancre que le routeur suit, ou — pour toute méthode
autre que GET — un bouton. Le préchargement n'est pas pris en
charge (Photon ne garde pas de cache de visites).

```tsx
<Link href="/orders" data={{ status: 'open' }}>Commandes ouvertes</Link>
<Link href={`/orders/${id}`} method="delete" onSuccess={() => toast('Supprimée')}>Supprimer</Link>
```

`Link`, `Form` et le routeur prennent aussi une
**route nommée** : `route`, `routeParams`, `qs`, et la méthode de la route sauf
si `method` est donné. Les routes sont celles de Ream, transmises une fois au
navigateur :

```ts
import { setRoutes, router } from '@c9up/photon/client'
setRoutes(routes) // router.namedRoutes() côté serveur (chemins + méthodes)

<Link route="users.show" routeParams={{ id: user.id }}>Profil</Link>
<Form route="users.update" routeParams={{ id: user.id }}>…</Form>   // PUT
router.visit({ route: 'users.update', routeParams: { id } }, { data })
```

`router.namedManifest()` marche aussi, chaque route étant alors un GET. `Form`
prend aussi `action={{ url, method }}`. Augmentez `PhotonRoutes` avec la table
qu'écrit `router.generateTypes()` et les noms comme les params sont vérifiés :

```ts
declare module '@c9up/photon/client' {
  interface PhotonRoutes extends RouteParams {}
}
```

Photon fixe les routes une fois pour le module — ce sont celles de
l'application, les mêmes sur chaque page. L'entrée client peut résoudre ses
pages avec `resolvePageComponent(name, import.meta.glob('./pages/**/*.tsx'))`.

Les visites autres que GET passent aussi par le routeur — `router.post(url, data)`,
`put`, `patch`, `delete`, ou `visit(url, { method, data })`. Les données partent
en JSON, ou en multipart dès qu'elles contiennent un fichier (`forceFormData`
pour l'imposer), avec le cookie `XSRF-TOKEN` renvoyé en `X-XSRF-TOKEN`. Une page
qui revient avec des erreurs de validation (ciblées par `errorBag`) appelle
`onError` au lieu de `onSuccess`. Une mutation en échec laisse la page telle
quelle plutôt que de recharger son URL en GET.

`useForm` tient les données,
les erreurs et l'état de soumission d'un formulaire — `form.data` et
`form.setData` en React, les champs au premier niveau en Vue et Svelte
(`v-model="form.email"`, `bind:value={form.email}`) :

```ts
const form = useForm({ email: '', password: '' })
form.post('/login', { onSuccess: () => form.reset('password') })
// form.errors.email · form.processing · form.isDirty · form.wasSuccessful
// form.recentlySuccessful · form.transform(fn) · form.cancel() · useForm('Login', {...})
```

`<Form>` lit ses données dans ses propres champs à la soumission et donne le
même état à ses enfants :

```tsx
<Form action="/login" method="post" resetOnSuccess={['password']}>
  {({ errors, processing }) => (
    <>
      <input name="email" />
      {errors.email && <p>{errors.email}</p>}
      <button disabled={processing}>Se connecter</button>
    </>
  )}
</Form>
```

Les formulaires n'ont pas de validation en direct contre le serveur pendant la
saisie, et la `progress` d'envoi reste `null` parce que le routeur envoie avec
`fetch`.
