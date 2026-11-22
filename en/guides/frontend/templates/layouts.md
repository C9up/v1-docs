# Layouts and components

This guide covers layouts, partials and components:

- Layouts & sections
- Partials
- Components
- Aurora islands

## Layouts & sections

A child template declares its layout with `@layout` (which must be the first node); the layout injects the child body at `{{> body }}` and named sections at their `@section` yields:

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

In a layout a `@section('name')…@endsection` is a **yield** with default content; in a child it **fills** the matching yield. `@super` inside a child section injects the layout's default content for that section. Names resolve by position — no separate declaration.

## Partials

`@include('name')` renders another template's nodes in the **same** scope; `@includeIf(condition, 'name')` includes only when the condition is truthy:

```inker
@include('partials/header')
@includeIf(user.isAdmin, 'partials/admin-bar')
```

A partial or component that does not exist is only an error (`E_INKER_TEMPLATE_NOT_FOUND`) when it actually renders, so one behind a false condition costs nothing. A partial or component may include itself — a tree or a comment thread renders one level per child — and the recursion ends on the data; nesting more than 100 partials/components deep throws `E_INKER_RENDER_DEPTH`.

## Components

`@component('name', { props })` renders a component template with its **own** scope built from the passed props (it does not inherit the caller's data). Engine globals (`engine.global(…)`) and the values a renderer `share()`s — the request, `app`, `qs` — are visible in every component, under its props. Block body content and `@slot('name')…@endslot` blocks render in the **caller's** scope and are injected at the component's slot outlets:

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

Inside a component:

- `$props` is a chainable API — `all()`, `get(key, fallback)` and `has(key)` (both take dot paths such as `'user.name'`), `only(keys)`, `except(keys)`, `merge(defaults)` (caller props win; `class` is combined across its string, array and object forms, so a caller's empty or `false` class keeps the defaults), and `toAttrs()` (serialise to an HTML attribute string, every value escaped). Each prop is also readable as `$props.<name>`.
- `$slots.main()` renders the default (body) slot; `$slots.<name>()` a named slot; `$slots.<name>` is `undefined` when absent, so `@if($slots.footer)` works.
- A slot can take an argument: `@slot('row', item)…@endslot` binds `item` to what the component passes, so a list component renders each entry with `$slots.row(entry)`.

The props are any JavaScript expression — an object literal with quoted keys, arrays, calls or ternaries, a variable, a spread (`{ ...$props.all(), id: 'k' }`). The name can be an expression too: `@component(kind, props)` and `@include(partialName)` resolve the name when they render, under the same path rules as a literal one (no `..`, no absolute path, contained in the disk root).

## Aurora islands

A helper can return a [SafeString](/en/guides/frontend/templates/#html-escape-vs-raw) of server-rendered [Aurora](/en/guides/frontend/aurora/) markup, embedding a reactive island inside an Inker template — `renderToString(component(data))` on the server, `hydrate(el, component)` on the client. No glue code lives in either package. See [Embedding aurora in inker templates](/en/guides/frontend/aurora/server-rendering#embedding-aurora-in-inker-templates).
