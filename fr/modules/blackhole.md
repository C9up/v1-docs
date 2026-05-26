# Blackhole — Sécurité

`@c9up/blackhole` est un filtre de sécurité Rust-natif autonome pour tout framework Node.js. Il s'exécute **avant** la frontière NAPI — les requêtes rejetées n'atteignent jamais Node.js. Compatible Ream via `@c9up/blackhole/middleware`, ou standalone avec Express/Fastify via `blackholeExpress()` / `blackholeFastify()`.

## Installation

```bash
pnpm add @c9up/blackhole
ream configure @c9up/blackhole
```

Le package fournit trois adaptateurs :
- `@c9up/blackhole/provider` — Provider IoC Ream
- `@c9up/blackhole/middleware` — Middleware Ream
- `blackholeExpress(options)` / `blackholeFastify(...)` — adaptateurs standalone

## Architecture

```
Requête HTTP → [Filtre Blackhole (Rust)] → NAPI → Node.js
                   ├── Rate Limiting
                   ├── Validation CSRF
                   └── Sanitization XSS
```

Blackhole implémente le trait `SecurityFilter` de `ream-http`. Chaque vérification s'exécute en Rust, avant que la requête ne traverse vers JavaScript.

## Configuration

```rust
BlackholeConfig {
    xss_enabled: true,          // Défaut : true
    csrf_enabled: true,         // Défaut : true
    rate_limit: Some((100, 60)), // 100 requêtes par 60 secondes
}
```

Par défaut, la sanitization XSS et la validation CSRF sont **activées**. Le rate limiting est désactivé sauf configuration explicite.

## Sanitization XSS

Toutes les query strings et corps de requête sont sanitizés en échappant les entités HTML :

| Entrée | Sortie |
|--------|--------|
| `<script>` | `&lt;script&gt;` |
| `"onclick="` | `&quot;onclick=&quot;` |
| `'alert(1)'` | `&#x27;alert(1)&#x27;` |

La sanitization est **toujours appliquée** quand elle est activée — il n'y a pas de garde de détection qui peut être contournée.

Si l'entrée a été modifiée, la requête continue avec `FilterResult::Sanitized(request)` contenant les données nettoyées.

## Protection CSRF

Les méthodes HTTP qui modifient l'état (`POST`, `PUT`, `PATCH`, `DELETE`) requièrent un token CSRF valide dans le header `x-csrf-token`.

### Cycle de vie du token

1. **Générer** — Appeler `generate_csrf_token()` pour obtenir un token cryptographiquement aléatoire (32 octets via `getrandom`)
2. **Envoyer** — Retourner le token au client (ex: dans un header ou corps de réponse)
3. **Soumettre** — Le client l'inclut dans `x-csrf-token` à la prochaine requête modifiant l'état
4. **Valider** — Le token est vérifié et **consommé** (usage unique)

```
GET /csrf-token          → 200 { token: "a1b2c3..." }
POST /orders             → 403 CSRF_FAILED (pas de token)
POST /orders + x-csrf-token: a1b2c3...  → 200 OK (token consommé)
POST /orders + x-csrf-token: a1b2c3...  → 403 CSRF_FAILED (déjà utilisé)
```

Propriétés :
- **Aléatoire cryptographique** — crate `getrandom` (CSPRNG), pas basé sur le timestamp
- **Usage unique** — Chaque token est consommé à la validation (empêche le replay)
- **TTL** — Les tokens expirent après 1 heure (configurable)
- **Auto-purge** — Les tokens expirés sont nettoyés à la génération

### Méthodes sûres

`GET`, `HEAD` et `OPTIONS` ne requièrent pas de tokens CSRF.

## Rate Limiting

Suit les requêtes par IP client dans une fenêtre de temps glissante.

```rust
// 100 requêtes par 60 secondes
rate_limit: Some((100, 60))
```

Quand la limite est dépassée, la requête est rejetée avec :

```json
{ "error": { "code": "RATE_LIMITED", "message": "Too many requests" } }
```

Statut HTTP : `429 Too Many Requests`

Le rate limiter :
- Utilise le header `X-Forwarded-For` pour l'extraction de l'IP client (fallback sur `"unknown"`)
- Réinitialise le compteur quand la fenêtre de temps expire
- Purge périodiquement les entrées obsolètes pour empêcher la croissance mémoire

## Résultats du filtre

Le filtre de sécurité retourne un des trois résultats :

| Résultat | Signification |
|----------|---------------|
| `Allow(request)` | La requête a passé toutes les vérifications sans modification |
| `Sanitized(request)` | La sanitization XSS a modifié la requête |
| `Reject(response)` | Requête bloquée — 403 (CSRF) ou 429 (rate limit) |

## Étapes suivantes

- [Warden (Auth)](/fr/modules/warden) — Authentification au niveau applicatif
- [Middleware](/fr/guide/middleware) — Pipeline middleware Node.js
