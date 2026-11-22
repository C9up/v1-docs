# Building the app

This guide covers building and running the mobile app.

## Mobile apps

A project with a `mobile` block in `reamrc.ts` builds its Android app with
`ream`, from the same aurora components as its pages. The Android project is
generated into `.ream/android` on every run and never committed.

```ts
// reamrc.ts
export default defineConfig({
  mobile: {
    name: 'Tessel',
    id: 'ch.example.tessel',     // the application id: dotted, each part a letter first
    entry: 'mobile/index.ts',    // calls run(App) from @c9up/orbit/react-native
    version: '1.2.0',            // versionName
    build: 12,                   // versionCode, raised for each store upload
    icon: 'resources/icon.png',  // optional, a PNG
    css: 'mobile/app.css',       // optional, the Tailwind entry (see below)
    android: {
      permissions: ['CAMERA'],   // android.permission.CAMERA; a dotted name is kept
      abis: ['arm64-v8a', 'x86_64'],
      signing: { keystore: 'android/release.keystore', alias: 'release' },
    },
  },
})
```

```ts
// mobile/index.ts
import { run } from '@c9up/orbit/react-native'
import { App } from './App.js'

run(App)
```

```bash
ream android:run                # debug build on the attached device, JS served by Metro
ream android:run --device <id>  # one of several devices (adb devices)
ream android:run --release      # the signed release build, its JS inside
ream android:build              # app-debug.apk
ream android:build --release    # app-release.apk, signed
ream android:build --aab        # app-release.aab for the Play Store, signed
```

What a run does:

- what the build needs is checked first, and anything missing is named with
  the `pnpm add` that installs it — React Native's own tooling (its Gradle
  plugin, codegen) is taken from where `react-native` really is, so an app
  under pnpm's isolated linker does not declare it;
- the dependencies that declare native parts (`reamNative` in their
  package.json, as `@c9up/orbit` does: platform sources, CMake, C++ modules,
  specs, Rust crates, and an `initializer` — a static
  `(Application) -> Unit` the app calls when it starts, before React Native
  loads) are found, direct or not, and wired into the generated project.
  Standard React Native libraries (an `android/build.gradle`, a
  TurboModule, as `@c9up/orbit-clipboard`) are added by React Native's
  autolinking;
- their Rust crates are cross-compiled for each ABI with the NDK's linker,
  taken from `ANDROID_NDK_HOME`, else the newest NDK under the SDK. A missing
  Rust target is named with the `rustup target add` that installs it;
- Gradle builds the app. A debug build is signed with the standard debug key;
  a release build with the app's keystore, whose passwords come from
  `REAM_ANDROID_STORE_PASSWORD` and `REAM_ANDROID_KEY_PASSWORD`, never from a
  file;
- `android:run` installs it over adb and starts it. A debug build loads its JS
  from Metro, which `android:run` starts first and keeps serving: a saved
  change reloads the app, no rebuild. Metro takes port 8081, or the next free
  one when another Metro holds it; the phone keeps asking 8081 (`adb
  reverse` maps it). In a monorepo, Metro watches the workspace root, so
  packages linked from elsewhere in it resolve.

The app's Tailwind classes style it on the phone as on the web. Each build
runs Tailwind over the app, as the web build does — the entry is
`mobile.css`, else `@import "tailwindcss"` scanning the mobile entry's
directory — and compiles its output into the style table orbit reads: the
theme's variables (light and dark), lengths and colours resolved, variants
turned into conditions (`data-*`, `aria-*`, `disabled`, `dark`, `group-*`,
`peer-*`, `[&_svg]`, `sm:`). The table travels in the JS bundle, so an
over-the-air update carries its own. Without Tailwind installed, the build
says so and no class styles anything. `ream css:compile <css> [-o table.json]`
compiles a stylesheet by hand.

`react-native`, `@react-native-community/cli`, `@react-native/metro-config`
and `@babel/runtime` (the 7.x line React Native's Babel preset wants) are the
app's dependencies; a package linked from elsewhere in a monorepo resolves
them from the app: React Native supplies the JS engine (Hermes), the
module registry and the activity. React itself is not used — orbit renders the
views.

A phone that refuses an install over USB (some manufacturers ask for each new
app) makes `android:run` say so, with the setting that allows it.

### Over-the-air updates

With [@c9up/robledo](https://github.com/C9up/robledo) installed and
`mobile.updates` set, a change to the JS reaches installed apps without a
store release:

```bash
ream generate:update-key     # robledo.key (keep it out of git) and the public key to paste
ream android:publish         # bundle, sign, write robledo/android/<runtime>/<id>/
```

```ts
mobile: {
  updates: {
    url: 'https://api.example.com/__robledo',  // the app's ream server
    publicKey: '…',
  },
}
```

The build writes the server, the public key and the app's **native runtime**
(a digest of React Native's version and every native package's version) into
the app; `android:publish` stamps the same runtime on what it signs, so an
update only reaches the builds that have the native code it needs. The
signing key comes from `REAM_UPDATES_KEY`, else `robledo.key`, and must match
`mobile.updates.publicKey`. Plain http is accepted only to this computer
(`localhost`, `127.0.0.1`, `10.0.2.2`), for development; the app is then
allowed cleartext to that host alone.
