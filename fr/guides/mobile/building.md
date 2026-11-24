# Construire l’app

Ce guide couvre la construction et l'exécution de l'app mobile.

## Applications mobiles

Un projet dont le `reamrc.ts` a un bloc `mobile` construit son app Android avec
`ream`, à partir des mêmes composants aurora que ses pages. Le projet Android
est généré dans `.ream/android` à chaque exécution et n'est jamais commité.

```ts
// reamrc.ts
export default defineConfig({
  mobile: {
    name: 'Tessel',
    id: 'ch.example.tessel',     // l'identifiant de l'app : pointé, chaque partie commençant par une lettre
    entry: 'mobile/index.ts',    // appelle run(App) de @c9up/orbit/react-native
    version: '1.2.0',            // versionName
    build: 12,                   // versionCode, augmenté à chaque envoi au store
    icon: 'resources/icon.png',  // facultatif, un PNG
    css: 'mobile/app.css',       // facultatif, l'entrée Tailwind (voir plus bas)
    android: {
      permissions: ['CAMERA'],   // android.permission.CAMERA ; un nom pointé est gardé tel quel
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
ream android:run                # build debug sur l'appareil branché, JS servi par Metro
ream android:run --device <id>  # l'un de plusieurs appareils (adb devices)
ream android:run --release      # le build release signé, son JS embarqué
ream android:build              # app-debug.apk
ream android:build --release    # app-release.apk, signé
ream android:build --aab        # app-release.aab pour le Play Store, signé
```

Ce que fait une exécution :

- ce dont le build a besoin est vérifié d'abord, et ce qui manque est nommé
  avec le `pnpm add` qui l'installe — l'outillage propre de React Native (son
  plugin Gradle, codegen) est pris là où se trouve vraiment `react-native`, si
  bien qu'une app sous le linker isolé de pnpm n'a pas à le déclarer ;
- les dépendances qui déclarent des parties natives (`reamNative` dans leur
  package.json, comme `@c9up/orbit` : sources de plateforme, CMake, modules
  C++, specs, crates Rust, et un `initializer` — une méthode statique
  `(Application) -> Unit` que l'app appelle à son démarrage, avant le
  chargement de React Native) sont trouvées, directes ou non, et câblées dans
  le projet généré. Les bibliothèques React Native standard (un
  `android/build.gradle`, un TurboModule, comme `@c9up/orbit-clipboard`) sont
  ajoutées par l'autolinking de React Native ;
- leurs crates Rust sont compilées pour chaque ABI avec l'éditeur de liens du
  NDK, pris dans `ANDROID_NDK_HOME`, sinon le NDK le plus récent du SDK. Une
  cible Rust manquante est nommée avec le `rustup target add` qui l'installe ;
- Gradle construit l'app. Un build debug est signé avec la clé de debug
  standard ; un build release avec la keystore de l'app, dont les mots de
  passe viennent de `REAM_ANDROID_STORE_PASSWORD` et
  `REAM_ANDROID_KEY_PASSWORD`, jamais d'un fichier ;
- `android:run` l'installe par adb et la lance. Un build debug charge son JS
  depuis Metro, que `android:run` démarre d'abord et garde ouvert : une
  modification enregistrée recharge l'app, sans rebuild. Metro prend le port
  8081, ou le suivant libre quand un autre Metro l'occupe ; le téléphone
  demande toujours 8081 (`adb reverse` fait la correspondance). Dans un
  monorepo, Metro surveille la racine du workspace, si bien que les paquets
  liés depuis ailleurs s'y résolvent.

Les classes Tailwind de l'app la stylent sur le téléphone comme sur le web.
Chaque build lance Tailwind sur l'app, comme le build web — l'entrée est
`mobile.css`, sinon `@import "tailwindcss"` qui parcourt le dossier de
l'entrée mobile — et compile sa sortie en table de styles lue par orbit : les
variables du thème (clair et sombre), longueurs et couleurs résolues, les
variantes changées en conditions (`data-*`, `aria-*`, `disabled`, `dark`,
`group-*`, `peer-*`, `[&_svg]`, `sm:`). La table voyage dans le bundle JS :
une mise à jour à distance emporte la sienne. Sans Tailwind installé, le build
le signale et aucune classe ne style rien. `ream css:compile <css> [-o table.json]`
compile une feuille à la main.

`react-native`, `@react-native-community/cli`, `@react-native/metro-config` et
`@babel/runtime` (la ligne 7.x que veut le preset Babel de React Native) sont
des dépendances de l'app ; un paquet lié depuis ailleurs dans un monorepo les
résout depuis l'app : React Native fournit le moteur JS (Hermes), le
registre des modules et l'activité. React lui-même n'est pas utilisé : c'est
orbit qui rend les vues.

Un téléphone qui refuse une installation par USB (certains constructeurs le
demandent pour chaque nouvelle app) fait dire à `android:run` le réglage qui
l'autorise.

### Mises à jour à distance

Avec [@c9up/robledo](https://github.com/C9up/robledo) installé et
`mobile.updates` renseigné, une modification du JS atteint les apps installées
sans passer par un store :

```bash
ream generate:update-key     # robledo.key (lisible par vous seul, listé dans le .gitignore de ream new) et la clé publique à coller
ream android:publish         # bundle, signe, écrit robledo/android/<runtime>/<id>/
```

```ts
mobile: {
  updates: {
    url: 'https://api.example.com/__robledo',  // le serveur ream de l'app
    publicKey: '…',
  },
}
```

Le build inscrit dans l'app le serveur, la clé publique et sa **version
native** (une empreinte de la version de React Native et de chaque paquet
natif) ; `android:publish` appose la même version sur ce qu'il signe : une mise
à jour n'atteint que les builds qui ont le code natif dont elle a besoin. La
clé de signature vient de `REAM_UPDATES_KEY`, sinon de `robledo.key`, et doit
correspondre à `mobile.updates.publicKey`. Le http en clair n'est accepté que
vers cette machine (`localhost`, `127.0.0.1`, `10.0.2.2`), pour le
développement ; l'app n'est alors autorisée en clair que vers cet hôte.

Un téléphone ne fait qu'avancer. `android:publish` date chaque mise à jour du
moment où elle a été construite (`createdAt`, signé avec le reste). Un
téléphone refuse une mise à jour qui n'est pas plus récente que la plus récente
qu'il a acceptée, avec `E_ROBLEDO_NOT_NEWER`. Un serveur ou un CDN qui sert à
nouveau une ancienne mise à jour ne peut donc pas y ramener les apps
installées. Pour revenir en arrière volontairement, publiez à nouveau l'ancien
code : `android:publish` le signe comme une nouvelle mise à jour.

Le build inscrit aussi deux champs dans l'app (`assets/ream-updates.json`).
Chacun ferme une brèche :

- `embeddedCreatedAt` est l'heure du build, en secondes. Le JS contenu dans
  l'app date au moins de ce moment. Un téléphone refuse une mise à jour publiée
  avant ce build. Il abandonne aussi celle qu'il détient quand une version du
  store apporte un build plus récent. Sans ce champ, une app mise à jour depuis
  le store continue de lancer une mise à jour à distance plus ancienne.
- `appId` est le `mobile.id` de l'app, son `applicationId` Android.
  `android:publish` signe le même identifiant dans chaque mise à jour, et un
  téléphone refuse une mise à jour qui nomme une autre app. Sans ce champ, une
  mise à jour publiée pour une autre de vos apps, signée avec la même clé,
  s'installerait.

Un build du store ne prend donc pas une mise à jour publiée avant lui. Si cette
mise à jour doit encore s'appliquer, publiez-la à nouveau après le build. Les
deux heures viennent de l'horloge de la machine qui construit ou publie : une
horloge en avance fait refuser aux téléphones les mises à jour publiées avant
cette heure.
