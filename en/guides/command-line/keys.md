# Keys and integrations

This guide covers keys and integrations.

## Keys and integrations

```bash
ream generate:key           # a fresh APP_KEY into .env
ream generate:key --show    # print one instead, for a secrets manager
ream generate:key --force   # replace an existing key (invalidates every session)
ream mcp install            # register the Ream MCP server in .mcp.json
ream mcp status
ream template kitchen-sink  # clone a reference app and start it on a fresh history
```

`generate:key` never prints the key it writes: stdout ends up in shell history,
scrollback and CI logs, so `.env` is the only sink. It refuses on a machine that
says it is production — under `production` or `prod`, because the second is
ordinary in a Dockerfile and read strictly it would take the guard off.

A project that keeps a `.env.example` gets `APP_KEY=` recorded there with no
value, so the variable is documented and the key stays in `.env`. `ream new`
writes that file: every variable of `.env`, with `APP_KEY` and `DB_PASSWORD`
left empty. Its `.gitignore` keeps every environment file that holds your
own values out of git: `.env`, `.env.local` and `.env.*.local` (the files the
loader reads as local overrides). `.env.example` and the shared
`.env.<NODE_ENV>` files stay committed. It also ignores `robledo.key`, the
update signing key, and `*.keystore`.

A `.env` that `ream new` or `generate:key` creates is readable by its owner
only (`0600`): it holds the key that signs every cookie and session. An
existing `.env` keeps the mode you gave it. `generate:key` refuses a `.env` or
`.env.example` that is a symbolic link or not a regular file, and then writes
nothing: right after a clone, the repository decides what those names are, and
a link would carry the write into another file of your account.

`mcp install` and `mcp uninstall` apply the same check to `.mcp.json`, and
`generate:update-key` to its key file, which it also makes readable by you only
(`0600`), even when `--force` replaces a file that others could read.
