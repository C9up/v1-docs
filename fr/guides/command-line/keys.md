# Clés et intégrations

Ce guide couvre les clés et les intégrations.

## Clés et intégrations

```bash
ream generate:key           # une APP_KEY fraîche dans .env
ream generate:key --show    # l'imprimer plutôt, pour un gestionnaire de secrets
ream generate:key --force   # remplacer une clé existante (invalide toutes les sessions)
ream mcp install            # enregistrer le serveur MCP Ream dans .mcp.json
ream mcp status
ream template kitchen-sink  # cloner une app de référence et repartir d'un historique vierge
```

`generate:key` n'imprime jamais la clé qu'elle écrit : stdout finit dans
l'historique du shell, le scrollback et les logs de CI, donc `.env` est le seul
puits. Elle refuse sur une machine qui se déclare en production — sous
`production` comme sous `prod`, parce que le second est ordinaire dans un
Dockerfile et qu'une lecture stricte lèverait la garde.

Un projet qui tient un `.env.example` y voit `APP_KEY=` inscrite sans valeur :
la variable est documentée et la clé reste dans `.env`. `ream new` écrit ce
fichier : toutes les variables de `.env`, avec `APP_KEY` et `DB_PASSWORD` vides,
Son `.gitignore` exclut de git chaque fichier d'environnement qui contient vos
propres valeurs : `.env`, `.env.local` et `.env.*.local` (les fichiers que le
chargeur lit comme surcharges locales). `.env.example` et les fichiers partagés
`.env.<NODE_ENV>` restent committés. Il exclut aussi `robledo.key`, la clé qui
signe les mises à jour, et `*.keystore`.

Un `.env` créé par `ream new` ou `generate:key` n'est lisible que par son
propriétaire (`0600`) : il contient la clé qui signe chaque cookie et chaque
session. Un `.env` existant garde le mode que vous lui avez donné.
`generate:key` refuse un `.env` ou un `.env.example` qui est un lien symbolique
ou pas un fichier ordinaire, et n'écrit alors rien : juste après un clone,
c'est le dépôt qui décide de ce que sont ces noms, et un lien porterait
l'écriture vers un autre fichier de votre compte.

`mcp install` et `mcp uninstall` font la même vérification sur `.mcp.json`, et
`generate:update-key` sur son fichier de clé. Ce fichier n'est lisible que par
vous (`0600`), même quand `--force` remplace un fichier que d'autres pouvaient
lire.
