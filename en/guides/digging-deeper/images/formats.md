# Formats and colour

This guide covers formats, colour and bit depth:

- Formats
- Colour
- Bit depth

## Formats

Fifteen decoders are compiled in — `jpeg png webp gif bmp ico tiff tga qoi pnm
dds farbfeld hdr openexr avif` — and fourteen of them encode (`image` ships no
DDS encoder, so naming it as an output is refused up front).

**Which of them an application accepts is a runtime decision, and the default
is three.** Every decoder is parser surface reachable from whatever an upload
form receives, so widening is deliberate:

```ts
export default defineConfig({
  limits: { allowedFormats: ['jpeg', 'png', 'webp', 'gif'] },
})
```

An unknown name raises rather than being skipped — a typo that silently
narrowed the list would surface as uploads refused in production for no
visible reason.

### One that writes but cannot be read back

Prism identifies by CONTENT, never by a filename, and that has a cost: a
format whose bytes carry no signature at the front cannot be recognised.

**TGA** puts its identifier in a *footer*, so it is not recognised at all. It
can be written and never accepted as an upload — putting `tga` in
`allowedFormats` does not make a TGA uploadable.

AVIF used to be in this paragraph. It reads and writes now, which is why this
package takes a system dependency — see below.

### WebP is lossy by default

A lossless WebP is several times the size of a lossy one, and size is the
entire reason anyone reaches for the format. `image` ships no lossy encoder, so
that path goes through libwebp. `quality: 100` selects lossless — the one value
that cannot mean "compress a bit".

### AVIF takes an effort

```ts
await images.edit(photo).toBuffer({ format: 'avif', quality: 60, effort: 2 })
```

`quality` is honoured as for every lossy format, and `effort` runs from 0
(fastest) to 9 (slowest), 4 by default. An AVIF encoder trades a great deal of
CPU for a few bytes: on a 1600px image effort 4 took four times as long as
effort 1 for a file within one percent. Only AVIF has the knob.

### What installing this needs: nothing

The published binaries carry their own codecs. libwebp is vendored, and
libdav1d — the AVIF *decoder*, without which an AVIF could be written and never
read — is compiled from source and linked statically by the release workflow.
`ldd` on a published binary lists libc, libm and libgcc, and that is all.

### What building it from source needs

Only relevant when no prebuilt binary matches the platform, or when working on
the crate itself. libwebp still costs nothing but a C compiler. libdav1d is the
one that asks for something, and there are two ways to give it:

- **a system libdav1d** — `libdav1d-dev` on Debian, `dav1d` on Homebrew, the
  vcpkg package on Windows. `dav1d-sys` finds it through pkg-config. The
  resulting binary then *needs* that library at runtime, which is fine for a
  local build and is why it is not how releases are made.
- **`SYSTEM_DEPS_DAV1D_BUILD_INTERNAL=auto`**, with `meson`, `ninja` and (on
  x86) `nasm` on PATH. `dav1d-sys` clones dav1d and builds it statically. This
  is what CI does.

One trap worth knowing if a build goes strange: `dav1d-sys` runs meson through
a call that checks the process could be *started*, not that it succeeded. With
`nasm` missing, meson fails, nothing is reported, and the link quietly falls
back to whatever else is on the system. Check that all three tools resolve
before blaming the crate.

### The size of the binary

All fifteen formats take the native binary from roughly 2.3 MB to 11 MB, most
of it the AVIF codec. Multiplied across prebuilt platforms that is the dominant
cost of the package: an application that only handles jpeg, png and webp is
paying for twelve codecs it will never allow. Making the set a build feature as
well as a runtime one would fix that, and has not been done.

## Colour

```ts
await images.edit(photo).convertColorSpace({ to: 'display-p3' }).toFormat('png')
```

The samples are *transformed* — primaries and transfer function applied —
rather than reinterpreted. `inspect()` reports what a file declares as
`colorSpace`.

Five spaces: `srgb`, `linear-srgb`, `display-p3`, `dci-p3`, `rec709`. The list
is short because it was proved rather than assumed: `rec2020` and the two HDR
transfers were implemented, tried against the library, found to raise "not
supported" for BT.2020 primaries, and removed. A name that can only fail is
worse than an absent one.

**Two things this cannot do**, both from the model rather than the code:

- **`image` reads no ICC profile.** A JPEG carrying an Adobe RGB profile is
  decoded as sRGB, because the profile is never seen. Pass `from` when you know
  better — it overrides the file's claim rather than converting:
  `convertColorSpace({ to: 'srgb', from: 'display-p3' })`.
- **Adobe RGB has no CICP code point at all**, so it cannot be named here by
  anyone. Work that needs it needs an ICC pipeline, which is a different
  dependency.

## Bit depth

```ts
await images.edit(scan).toBuffer({ format: 'png', depth: 16 })
```

Only PNG and TIFF carry sixteen bits. Elsewhere the encoder narrows back to
eight rather than refusing — a pipeline that sets `depth` once should not break
when its output format is switched.
