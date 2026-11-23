# Owning the source

`ream nebula:add` copies a component's code into your project. From then on the code is yours: change it however you like, with no version to follow and no wrapper to work around.

```sh
ream nebula:list                    # every available component
ream nebula:list --layer organisms
ream nebula:add dialog data-table   # these two components, and the ones they depend on
ream nebula:diff                    # which copies the package has changed since
ream nebula:add button --force      # replace your copy, even an edited one
```

These commands come with the package itself: `configure()` registers them in `reamrc.commands`. They are not part of the `ream` binary, so a new nebula command does not wait for a new version of `ream`.

**JavaScript by default.** An Aurora app sends `resources/pages` to the browser with no build step, so a TypeScript file placed there would not run. `ream nebula:add` copies the compiled code: ESM with `.js` imports, comments included. If your components folder already holds TypeScript, the command copies TypeScript. `--ts` and `--js` force one or the other.

Copied files keep the same layout as in the package: `atoms/Button` imports `../lib/cva.js`, as it does inside nebula. So no import is ever rewritten.

## Keeping up with fixes: `ream nebula:diff`

Once copied, a file no longer receives the package's fixes. Updating `@c9up/nebula` (with `pnpm update`, for example) does not change your copies, and nothing tells you that a fix exists.

`ream nebula:diff` compares your copies with the installed package. When it copies a file, nebula records a hash of it. With that hash, the command knows who changed what: you, the package, or both.

| State | What it means |
|---|---|
| `edited` | you changed the file, the package did not: nothing to do |
| `outdated` | the package changed the file, you did not: you can copy it again and lose nothing |
| `conflict` | you and the package both changed the file: compare by hand |
| `unknown` | the file was copied before nebula recorded hashes: no way to know who changed it |

At the end, the report gives a `ream nebula:add --force …` command, ready to paste, that copies the `outdated` components again.

- **Components, not files:** the command names components. A shared file, such as `lib/icons.ts` or `primitives/menu.ts`, is copied again with the component that uses it.
- **Nothing of your work is overwritten:** a component is only suggested when none of the files it would copy is `edited`, `conflict` or `unknown`. This includes the files of the components it depends on.
- **Other outdated files:** an `outdated` file that only belongs to components you edited is listed separately. Compare it by hand.

Run `ream nebula:diff` every time you update `@c9up/nebula`. An example of what happens otherwise: `primitives/presence.ts` received a fix that removes an overlay from the page even when its closing animation never ends. With an old copy of that file, a closed dialog can stay in the page as an invisible full-screen backdrop that blocks clicks. Sixteen overlay components use that file, and nothing in the symptom points at it.
