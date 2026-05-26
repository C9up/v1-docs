# ream-cli

`@c9up/ream-cli` est la CLI native (Rust) de l'ecosysteme.

## Capacites

- scaffolding projet
- commandes de dev/build/start
- generation de code (`make:*`)
- diagnostics (`doctor`, `info`)
- configuration de packages (`ream configure`)

## Exemple

```bash
ream new my-app
ream dev
ream make:controller order Order
ream doctor
```

## Notes

- startup tres rapide (binaire natif)
- surface de commande en evolution continue
