# ream-cli

Ce guide couvre la publication de ream-cli :

- Cadence
- Séquence de bump de version
- Règle SemVer
- Override (`confirm_overwrite: YES`)

## Publier ream-cli

### Cadence

La publication est manuelle. Les mainteneurs déclenchent une release via l'interface GitHub Actions (Actions → ream-cli-ci → Run workflow) sur le dépôt ream-cli — pas de publication automatique sur push de tag. Seul un lancement délibéré depuis l'interface publie, si bien qu'un tag local poussé par erreur n'atteint jamais npm.

### Séquence de bump de version

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

### Règle SemVer

- Ajout de fonctionnalité (nouvelle sous-commande, nouvelle API publique) → bump MINOR.
- Correction de bug sans changement de surface → bump PATCH.
- Refactor interne sans changement visible côté consommateur → pas de bump.

### Override (`confirm_overwrite: YES`)

Le gate de dérive compare la version du `Cargo.toml` local à celle publiée sur npm :

- **Supérieure** à celle de npm : publiée sous le dist-tag `latest`.
- **Égale** à celle de npm : refusée, et aucune entrée n'y change rien. npm n'accepte jamais deux fois le même numéro de version, même après une dépublication : il faut bumper le `Cargo.toml`.
- **Inférieure** à celle de npm : refusée, sauf si l'entrée de workflow `confirm_overwrite` (défaut `no`) vaut la chaîne littérale `YES`. Un run confirmé la publie sous le dist-tag `backport` : `latest` reste sur la version plus récente et une installation neuve ne revient pas à l'ancienne ligne. À utiliser pour livrer un correctif sur une ligne de release antérieure.

Toute autre erreur (pas de tag sur HEAD, mismatch tag-vs-`Cargo.toml`, registre npm injoignable) est fail-closed : aucun override possible.

Les gates existent pour deux raisons : une release n'a lieu que quand quelqu'un la demande, et ce qui atteint npm est exactement le commit tagué, jamais une version que npm détient déjà, et jamais une version plus ancienne sauf si `confirm_overwrite: YES` le demande, sous `backport`.
