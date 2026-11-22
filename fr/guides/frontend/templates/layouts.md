# Layouts et composants

Ce guide couvre les layouts, les partials et les composants :

- Layouts & sections
- Partials
- Composants
- Îlots Aurora

## Layouts & sections

Un template enfant déclare son layout avec `@layout` (qui doit être le premier nœud) ; le layout injecte le corps de l'enfant à `{{> body }}` et les sections nommées à leurs yields `@section` :

```inker
{{-- layouts/main.inker --}}
<html>
  <head><title>@section('title')Default title@endsection</title></head>
  <body>{{> body }}</body>
</html>
```

```inker
{{-- home.inker --}}
@layout('layouts/main')
@section('title')Home — @super@endsection
<h1>Welcome</h1>
```

Dans un layout, un `@section('name')…@endsection` est un **yield** avec un contenu par défaut ; dans un enfant, il **remplit** le yield correspondant. `@super` à l'intérieur d'une section enfant injecte le contenu par défaut du layout pour cette section. Les noms se résolvent par position — pas de déclaration séparée.

## Partials

`@include('name')` rend les nœuds d'un autre template dans le **même** scope ; `@includeIf(condition, 'name')` inclut seulement lorsque la condition est truthy :

```inker
@include('partials/header')
@includeIf(user.isAdmin, 'partials/admin-bar')
```

Un partial ou un composant inexistant n'est une erreur (`E_INKER_TEMPLATE_NOT_FOUND`) que lorsqu'il est réellement rendu : derrière une condition fausse, il ne coûte rien. Un partial ou un composant peut s'inclure lui-même — un arbre ou un fil de commentaires rend un niveau par enfant — et la récursion s'arrête sur les données ; plus de 100 niveaux de partials/composants imbriqués lèvent `E_INKER_RENDER_DEPTH`.

## Composants

`@component('name', { props })` rend un template de composant avec son **propre** scope construit à partir des props passées (il n'hérite pas des données de l'appelant). Les globales du moteur (`engine.global(…)`) et les valeurs qu'un renderer `share()` — la requête, `app`, `qs` — sont visibles dans chaque composant, sous ses props. Le contenu du corps de bloc et les blocs `@slot('name')…@endslot` rendent dans le scope de **l'appelant** et sont injectés aux sorties de slot du composant :

```inker
{{-- components/card.inker --}}
<div {{ $props.only(['id']).toAttrs() }} class="{{ $props.get('class', 'card') }}">
  <header>{{ title }}</header>
  {{ $slots.main() }}
  @if($slots.footer)<footer>{{ $slots.footer() }}</footer>@endif
</div>
```

```inker
@component('components/card', { title: 'Invoice', class: 'card lg' })
  <p>Body goes to the default (main) slot.</p>
  @slot('footer')<a href="/pay">Pay now</a>@endslot
@endcomponent
```

À l'intérieur d'un composant :

- `$props` est une API chaînable — `all()`, `get(key, fallback)` et `has(key)` (tous deux acceptent des chemins pointés comme `'user.name'`), `only(keys)`, `except(keys)`, `merge(defaults)` (les props de l'appelant l'emportent ; `class` est combiné sous ses formes chaîne, tableau et objet, si bien qu'une classe vide ou `false` de l'appelant garde celles par défaut), et `toAttrs()` (sérialise en une chaîne d'attributs HTML, chaque valeur échappée). Chaque prop se lit aussi comme `$props.<name>`.
- `$slots.main()` rend le slot par défaut (body) ; `$slots.<name>()` un slot nommé ; `$slots.<name>` vaut `undefined` s'il est absent, donc `@if($slots.footer)` fonctionne.
- Un slot peut recevoir un argument : `@slot('row', item)…@endslot` lie `item` à ce que le composant passe, et un composant de liste rend chaque entrée avec `$slots.row(entry)`.

Les props sont n'importe quelle expression JavaScript — un objet littéral avec des clés entre guillemets, des tableaux, des appels ou des ternaires, une variable, un spread (`{ ...$props.all(), id: 'k' }`). Le nom peut aussi être une expression : `@component(kind, props)` et `@include(partialName)` résolvent le nom au moment du rendu, sous les mêmes règles de chemin qu'un nom littéral (pas de `..`, pas de chemin absolu, contenu dans la racine du disque).

## Îlots Aurora

Un helper peut retourner une [SafeString](/fr/guides/frontend/templates/#echappement-html-vs-brut) de markup [Aurora](/fr/guides/frontend/aurora/) rendu côté serveur, embarquant un îlot réactif dans un template Inker — `renderToString(component(data))` sur le serveur, `hydrate(el, component)` sur le client. Aucun code de glue ne vit dans l'un ou l'autre package. Voir [Embarquer aurora dans les templates inker](/fr/guides/frontend/aurora/server-rendering#integrer-aurora-dans-les-templates-inker).
