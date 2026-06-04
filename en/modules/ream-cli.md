# ream-cli

`@c9up/ream-cli` is the native Rust CLI for the ecosystem.

## Capabilities

- project scaffolding
- dev/build/start commands
- code generation (`make:*`)
- diagnostics (`doctor`, `info`)
- package setup (`ream configure`)

## Example

```bash
ream new my-app
ream dev
ream make:controller order Order
ream doctor
```

## Notes

- very fast startup (native binary)
- command surface is still evolving
