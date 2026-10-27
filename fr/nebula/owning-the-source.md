# Posséder la source

`ream nebula:add` copie la source d'un composant dans votre projet et vous la remet. Pas de version, pas de chemin de mise à jour, pas d'emballage contre lequel se battre quand une maquette demande une classe changée.

```sh
ream nebula:list                    # tout le registre
ream nebula:list --layer organisms
ream nebula:add dialog data-table   # les deux, plus leurs dépendances
ream nebula:diff                    # les copies que le paquet a modifiées depuis
ream nebula:add button --force      # écrase votre copie modifiée
```

Ces commandes sont livrées par le paquet et enregistrées dans `reamrc.commands` par `configure()` — le canal prévu pour ça, que la découverte par répertoire ne peut pas voir. Rien n'est compilé dans le binaire `ream`, donc une nouvelle commande nebula n'attend pas une release de celui-ci.

**Du JavaScript par défaut.** Une application Aurora sert `resources/pages` au navigateur sans build — c'est la promesse du runtime — donc du TypeScript déposé dans cet arbre ne s'exécute pas. `ream nebula:add` copie la sortie compilée : de l'ESM valide, des spécificateurs `.js` déjà corrects, et tous les commentaires de doc intacts. Le langage est déduit de ce que contient déjà votre répertoire de composants ; `--ts` et `--js` forcent la main.

Les copies reprennent la disposition du paquet, si bien que `atoms/Button` trouve `../lib/cva.js` pour la même raison qu'à l'intérieur de nebula. **Aucun import n'est réécrit** — c'est là qu'un outil de copie-la-source accumule d'ordinaire ses cas particuliers.

## La contrepartie : `ream nebula:diff`

La copie va dans un seul sens. Un correctif publié ici n'atteint jamais un projet tout seul, et rien ne le signale — les fichiers sont locaux, aucun lockfile ne les mentionne, `pnpm update` n'y touche pas.

`ream nebula:diff` répond avec la *raison* d'une différence. Une copie finit forcément par diverger de l'amont — c'est ce que posséder la source veut dire — donc « diffère » tout seul signalerait tout l'arbre et ne voudrait rien dire. L'empreinte enregistrée au moment de la copie est ce qui sépare une modification que vous avez faite d'une que vous n'avez pas vue :

| État | Ce que ça veut dire |
|---|---|
| `edited` | votre modification, rien à faire |
| `outdated` | le paquet a bougé, votre copie non — recopier ne perd rien |
| `conflict` | les deux ont bougé |
| `unknown` | copié avant que l'empreinte existe — impossible de dire quel côté a bougé |

Lancez-le à chaque montée de version du paquet. Un `primitives/presence.ts` copié puis oublié sur plusieurs versions, c'est ainsi qu'un overlay garde un comportement corrigé en amont : la copie est antérieure au délai borné qui démonte une surface dont l'`animationend` n'arrive jamais, et les dialogues fermés restent dans le document en fond plein écran invisible. Ce fichier appartient à seize composants d'overlay, donc rien dans le symptôme ne le désigne.
