# orbit-clipboard

`@c9up/orbit-clipboard` : le presse-papiers du système, avec les deux mêmes appels dans le navigateur et sur un téléphone. Guide : [API de l'appareil](/fr/guides/mobile/device-apis).

## Installation

```bash
pnpm add @c9up/orbit-clipboard
```

Sur un téléphone, l'autolinking de React Native ajoute le module natif à une app construite par `ream android:*` ; il n'y a rien à câbler.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@c9up/orbit-clipboard` | `writeText`, `readText` et la classe d'erreur. L'import se résout selon la plateforme : le build par défaut dans le navigateur et sur le serveur, le build `react-native` (la condition et le champ `react-native`) sur un téléphone. Les deux builds exportent les mêmes noms. |

| Plateforme | Ce que les appels atteignent |
|---|---|
| Navigateur | `navigator.clipboard`, sur une page sécurisée (https, localhost). La lecture demande l'accord de l'utilisateur. |
| Téléphone (Android) | Le TurboModule `OrbitClipboard` de l'app, au-dessus de `ClipboardManager`. Android ne laisse une app lire le presse-papiers que lorsqu'elle a le focus (10+) et prévient l'utilisateur quand elle le fait (13+). |
| Serveur | Pas de presse-papiers : les deux appels rejettent avec `E_ORBIT_CLIPBOARD_UNAVAILABLE`. |

Texte brut uniquement.

## Exports

| Export | Nature | Description |
|---|---|---|
| `writeText` | fonction | Place du texte dans le presse-papiers du système. |
| `readText` | fonction | Lit le texte du presse-papiers du système. |
| `errors` | namespace | Les erreurs du paquet, une classe par code, voir [Erreurs](#erreurs) |

### Fonctions

| Fonction | Signature | Description |
|---|---|---|
| `writeText` | `writeText(text: string): Promise<void>` | Place `text` dans le presse-papiers du système. |
| `readText` | `readText(): Promise<string>` | Le texte du presse-papiers du système ; `""` s'il n'en contient pas. |

## Erreurs

Chaque code est une classe de l'export `errors`, la même dans le navigateur et sur un téléphone ; l'échec de la plateforme est conservé dans `cause`.

| Code | Levée quand |
|---|---|
| [`E_ORBIT_CLIPBOARD_UNAVAILABLE`](/fr/reference/errors#e-orbit-clipboard-unavailable) | Aucun presse-papiers n'est joignable : le serveur, une page qui n'est pas un contexte sécurisé, ou une app construite sans le module natif. |
| [`E_ORBIT_CLIPBOARD_DENIED`](/fr/reference/errors#e-orbit-clipboard-denied) | La plateforme a refusé : pas de permission, ou la page ou l'app n'avait pas le focus. |

## Voir aussi

- [API de l'appareil](/fr/guides/mobile/device-apis)
- [Construire l'app](/fr/guides/mobile/building)
- [orbit-secure-store](/fr/reference/orbit-secure-store)
