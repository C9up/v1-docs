# Owning the source

`ream nebula:add` copies a component's source into your project and hands it over. No version, no upgrade path, no wrapper to fight when a design needs one class changed.

```sh
ream nebula:list                    # everything in the registry
ream nebula:list --layer organisms
ream nebula:add dialog data-table   # both, plus what they depend on
ream nebula:diff                    # which copies the package has since changed
ream nebula:add button --force      # overwrite your edited copy
```

These commands ship with the package and are registered in `reamrc.commands` by `configure()` — the channel provided for exactly this, which directory discovery cannot see. Nothing is compiled into the `ream` binary, so a new nebula command never waits on a release of it.

**JavaScript by default.** An Aurora app serves `resources/pages` to the browser unbuilt — that is the runtime's premise — so TypeScript dropped into that tree does not run. `ream nebula:add` copies the compiled output: valid ESM, `.js` specifiers already correct, every doc comment intact. The language is inferred from what your components directory already holds; `--ts` and `--js` override it.

Copies mirror the package's own layout, so `atoms/Button` finds `../lib/cva.js` for the same reason it does inside nebula. **No import is ever rewritten** — that is where a copy-the-source CLI usually accumulates its edge cases.

## The bill for that: `ream nebula:diff`

Copying is one way. A fix released here never reaches a project on its own, and nothing says so — the files are local, no lockfile mentions them, `pnpm update` does not touch them.

`ream nebula:diff` answers with the *reason* a file differs. A copy is expected to diverge from upstream eventually — that is what owning the source means — so "differs" alone would flag the whole tree and mean nothing. The hash recorded when you copied is what separates a change you made from one you have not seen:

| State | What it means |
|---|---|
| `edited` | yours, needs nothing |
| `outdated` | the package moved, your copy did not — re-copying loses nothing |
| `conflict` | both moved |
| `unknown` | copied before the record existed — no way to tell which side moved |

Run it when you upgrade the package. A copied `primitives/presence.ts` left behind across several releases is how an overlay keeps behaviour that was fixed upstream: the copy predates the deadline that removes a surface whose `animationend` never arrives, so closed dialogs stay in the document as invisible full-screen backdrops. The file is part of sixteen overlay components, so nothing about the symptom points at it.
