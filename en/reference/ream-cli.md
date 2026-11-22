# ream-cli

This guide covers releasing ream-cli:

- Cadence
- Version-bump sequence
- SemVer rule
- Override (`confirm_overwrite: YES`)

## Releasing ream-cli

### Cadence

Publishing is manual. Maintainers trigger a release via the GitHub Actions UI (Actions → ream-cli-ci → Run workflow) on the ream-cli repository — no tag-push auto-publish. Only a deliberate run from the UI publishes, so a stray local tag push never reaches npm.

### Version-bump sequence

```bash
# 1) Bump version
cd packages/ream-cli && $EDITOR Cargo.toml   # change version = "X.Y.Z"
git add Cargo.toml && git commit -m "release: ream-cli vX.Y.Z"

# 2) Tag (after the release commit lands on main — via PR if main is protected)
git tag -a vX.Y.Z -m "ream-cli vX.Y.Z"
git push origin vX.Y.Z

# 3) Trigger publish from GHA UI → Actions → ream-cli-ci → Run workflow
#    Select the vX.Y.Z tag as the ref (NOT main) so gates resolve the right tag.
```

### SemVer rule

- Feature addition (new subcommand, new public API surface) → MINOR bump.
- Bug fix with no surface change → PATCH bump.
- Internal-only refactor with no consumer-visible change → no bump.

### Override (`confirm_overwrite: YES`)

The drift gate compares the local `Cargo.toml` version with the one on npm:

- **Higher** than npm's: published under the `latest` dist-tag.
- **Equal** to npm's: refused, and no input changes that. npm never accepts a version number twice, even after an unpublish, so the fix is to bump `Cargo.toml`.
- **Lower** than npm's: refused unless the `confirm_overwrite` workflow input (default `no`) is the literal string `YES`. A confirmed run publishes it under the `backport` dist-tag, so `latest` stays on the newer version and a fresh install does not move back to the older line. Use it to ship a fix on an older release line.

Any other failure (no tag on HEAD, tag-vs-`Cargo.toml` mismatch, npm registry unreachable) is fail-closed: there is no override.

The gates exist for two reasons: a release only happens when someone asks for it, and what reaches npm is exactly the tagged commit, never a version npm already holds, and never an older one unless `confirm_overwrite: YES` says so, under `backport`.
