# Posséder la source

`ream nebula:add` copie le code d'un composant dans votre projet. Ce code vous appartient ensuite : vous le modifiez comme vous voulez, sans version à suivre ni surcouche à contourner.

```sh
ream nebula:list                    # tous les composants disponibles
ream nebula:list --layer organisms
ream nebula:add dialog data-table   # ces deux composants, et ceux dont ils dépendent
ream nebula:diff                    # les copies que le paquet a modifiées depuis
ream nebula:add button --force      # remplace votre copie, même modifiée
```

Ces commandes viennent du paquet lui-même : `configure()` les enregistre dans `reamrc.commands`. Elles ne font pas partie du binaire `ream`, donc une nouvelle commande nebula n'attend pas une nouvelle version de `ream`.

**Du JavaScript par défaut.** Une application Aurora envoie `resources/pages` au navigateur sans étape de build. Un fichier TypeScript placé là ne s'exécuterait donc pas. `ream nebula:add` copie le code déjà compilé : de l'ESM avec des imports en `.js`, commentaires compris. Si votre dossier de composants contient déjà du TypeScript, la commande copie du TypeScript. `--ts` et `--js` imposent l'un ou l'autre.

Les fichiers copiés gardent la même organisation que dans le paquet : `atoms/Button` importe `../lib/cva.js`, comme dans nebula. Aucun import n'est donc réécrit.

## Suivre les correctifs : `ream nebula:diff`

Une fois copié, un fichier ne reçoit plus les correctifs du paquet. Mettre à jour `@c9up/nebula` (avec `pnpm update`, par exemple) ne change pas vos copies, et rien ne vous prévient qu'un correctif existe.

`ream nebula:diff` compare vos copies au paquet installé. Au moment de la copie, nebula enregistre une empreinte de chaque fichier. Grâce à elle, la commande sait qui a changé quoi : vous, le paquet, ou les deux.

| État | Ce que ça veut dire |
|---|---|
| `edited` | vous avez modifié le fichier, le paquet non : rien à faire |
| `outdated` | le paquet a changé le fichier, vous non : vous pouvez le recopier sans rien perdre |
| `conflict` | vous et le paquet avez tous les deux changé le fichier : comparez à la main |
| `unknown` | le fichier a été copié avant que nebula enregistre les empreintes : impossible de savoir qui l'a changé |

À la fin, le rapport donne une commande `ream nebula:add --force …` prête à coller, qui recopie les composants `outdated`.

- **Des composants, pas des fichiers :** la commande nomme des composants. Un fichier partagé, comme `lib/icons.ts` ou `primitives/menu.ts`, est recopié avec le composant qui s'en sert.
- **Rien de votre travail n'est écrasé :** un composant n'est proposé que si aucun des fichiers qu'il recopierait n'est `edited`, `conflict` ou `unknown`. Cela compte aussi les fichiers des composants dont il dépend.
- **Les autres fichiers en retard :** un fichier `outdated` qui n'appartient qu'à des composants que vous avez modifiés est listé à part. Comparez-le à la main.

Lancez `ream nebula:diff` à chaque mise à jour de `@c9up/nebula`. Un exemple de ce qui arrive sinon : `primitives/presence.ts` a reçu un correctif. Il retire un overlay de la page même si son animation de fermeture ne se termine jamais. Avec une copie ancienne de ce fichier, un dialogue fermé peut rester dans la page sous la forme d'un fond invisible qui couvre tout l'écran et bloque les clics. Seize composants d'overlay utilisent ce fichier, et rien dans le symptôme ne le désigne.
