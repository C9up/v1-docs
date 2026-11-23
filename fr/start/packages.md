# Les paquets

Chaque paquet s'installe et fonctionne seul : une application ream prend ceux dont elle a besoin, et la plupart tournent aussi dans une autre application Node.js. Chacun a une page de référence qui liste toute son API, et un guide quand il en a un.

![Les paquets de ream par domaine. Cœur : ream, ream-cli, lumen. API : rune, comet, neutrino. Frontend : aurora, photon, inker, nebula, ephemeris. Données : atlas, quasar, eon. Authentification et sécurité : warden, transit, visa, sigil, blackhole. Temps réel : relay. Mobile : orbit, orbit-clipboard, orbit-secure-store, robledo. Services : archive, atom, bay, chronos, echo, eclipse, goldstone, nova, parsec, prism, rosetta, rover, spectrum, station, vellum. Tests et outils : helix, helix-plugin-ream, ream-mcp. Chaque paquet s'installe et fonctionne seul.](/images/packages-en.webp){width=640 height=640 loading=lazy}

## Cœur

- **`@c9up/ream`** : Le cœur du framework : l'application et son cycle de vie, le conteneur, l'environnement, le serveur HTTP avec son routeur, la requête, la réponse, les sessions et le parseur de corps, les événements, le planificateur, la console et le client de test. Guide : [Application](/fr/guides/concepts/application) · [Référence](/fr/reference/ream)
- **`@c9up/lumen`** : La sortie terminal, sans dépendance : couleurs, un logger au vocabulaire fixe, tableaux, encadrés, étapes et rapports de tâches, plus un mode brut qui rend tout cela vérifiable dans un test. Guide : [Sortie terminal](/fr/guides/command-line/terminal-output) · [Référence](/fr/reference/lumen)
- **`@c9up/ream-cli`** : Le binaire `ream`, écrit en Rust : il crée les projets, installe et configure les paquets, lance le serveur de développement, construit, teste, et transmet toute autre commande à la console de l'application. Guide : [Introduction](/fr/guides/command-line/introduction) · [Référence](/fr/reference/ream-cli)

## API

- **`@c9up/rune`** : Validation : chaînes de règles fluides, schémas d'objets aux types inférés, transformations, règles personnalisées et asynchrones, règles de base de données, contrôles de fichiers, messages d'erreur et sortie JSON Schema, exécutée par un moteur Rust natif. Guide : [Valider les entrées](/fr/guides/basics/validation/) · [Référence](/fr/reference/rune)
- **`@c9up/comet`** : Le protocole JSON-RPC 2.0 (enveloppes, analyse, codes d'erreur) et un client qui tourne dans le navigateur comme dans Node, sur un transport que vous injectez. Guide : [Clients JSON-RPC](/fr/guides/apis/json-rpc-clients) · [Référence](/fr/reference/comet)
- **`@c9up/neutrino`** : Protocol Buffers et gRPC unaire, pour que les clients non JS partagent un même contrat `.proto` avec le serveur ; les appels gRPC sont servis sur le port HTTP de l'application. Guide : [Protobuf et gRPC](/fr/guides/digging-deeper/grpc) · [Référence](/fr/reference/neutrino)

## Frontend

- **`@c9up/aurora`** : Des composants écrits en templates balisés sur des signaux, rendus en HTML côté serveur et hydratés dans le navigateur, sans étape de build. Guide : [Introduction](/fr/guides/frontend/aurora/) · [Référence](/fr/reference/aurora)
- **`@c9up/photon`** : Des pages pilotées par le serveur et rendues par React, Vue ou Svelte : le serveur choisit le composant de page et ses props, le client l'hydrate et navigue sans rechargement complet. Guide : [Introduction](/fr/guides/frontend/photon/) · [Référence](/fr/reference/photon)
- **`@c9up/inker`** : Des templates côté serveur dans des fichiers `.inker`, analysés en Rust, rendus avec échappement HTML par défaut. Guide : [Templates](/fr/guides/frontend/templates/) · [Référence](/fr/reference/inker)
- **`@c9up/nebula`** : Jeu de composants : shadcn/ui porté sur aurora, organisé en atomic design, copié dans votre app sous forme de source. [Section Nebula](/fr/nebula/)
- **`@c9up/ephemeris`** : Les données structurées schema.org : tout le vocabulaire typé, les entités d'une page reliées en un seul `@graph`, un JSON-LD qui ne peut pas sortir de sa balise script, et les exigences de Google pour les résultats enrichis vérifiées à la construction de chaque nœud. Guide : [Données structurées](/fr/guides/frontend/structured-data) · [Référence](/fr/reference/ephemeris)

## Couche de données

- **`@c9up/atlas`** : L'ORM : entités et modèles, repositories, un query builder compilé en SQL par un moteur Rust, migrations, schema builder, seeders, factories et aides de test, sur PostgreSQL, MySQL et SQLite. Guide : [ORM](/fr/guides/database/orm/) · [Référence](/fr/reference/atlas)
- **`@c9up/quasar`** : Les connexions Redis d'une application ream : connexions nommées ouvertes à la première utilisation, pub/sub sur une socket à part, contrôles de santé et arrêt propre. Guide : [Redis](/fr/guides/database/redis) · [Référence](/fr/reference/quasar)
- **`@c9up/eon`** : La couche séries temporelles sur TDengine : entités super-tables, ingestion colonnaire, constructeur de requêtes fenêtrées, migrations, abonnements aux changements et aides de test, sur une connexion WebSocket à taosAdapter. Guide : [Séries temporelles](/fr/guides/database/time-series/) · [Référence](/fr/reference/eon)

## Authentification et sécurité

- **`@c9up/warden`** : Authentification et autorisation : gardes session, JWT, jetons d'accès et HTTP Basic, décorateurs de route, un bouncer avec capacités et policies, rôles et permissions par portée, jetons remember-me et de rafraîchissement, authentification multifacteur (TOTP, codes de secours, codes à usage unique, passkeys) et limitation des tentatives de connexion. Guide : [Authentification](/fr/guides/auth/introduction) · [Référence](/fr/reference/warden)
- **`@c9up/transit`** : Connexion fédérée via une autorité que l'application ne possède pas : fournisseurs sociaux OAuth2 et OAuth1, tout émetteur OpenID Connect, fournisseurs d'identité SAML 2.0 et LDAP ou Active Directory. Guide : [Authentification sociale](/fr/guides/auth/social/) · [Référence](/fr/reference/transit)
- **`@c9up/visa`** : Un serveur d'autorisation OAuth 2.1 qui délivre des jetons à d'autres applications au nom d'un utilisateur : code d'autorisation avec PKCE, rotation des jetons de rafraîchissement, identifiants client, révocation, introspection et enregistrement de clients, sur un contrat de stockage. Guide : [Serveur OAuth](/fr/guides/oauth-server/introduction) · [Référence](/fr/reference/visa)
- **`@c9up/sigil`** : Hachage de mots de passe avec argon2, bcrypt et scrypt, exécuté par un moteur Rust natif. Guide : [Hachage](/fr/guides/security/hashing) · [Référence](/fr/reference/sigil)
- **`@c9up/blackhole`** : Un filtre de sécurité exécuté par un moteur Rust natif : jetons CSRF, limitation de débit, refus du path traversal et de la pollution de paramètres, CORS, en-têtes de protection avec une CSP à nonce, et assainissement des réponses HTML, pour ream, Express, Fastify et Hono. Il porte aussi le limiteur nommé par route. Guide : [Protection CSRF](/fr/guides/security/csrf) · [Référence](/fr/reference/blackhole)

## Temps réel

- **`@c9up/relay`** : Des messages temps réel vers le navigateur : des canaux diffusés en Server-Sent Events, et des hubs auxquels un client SignalR standard parle en WebSockets ou en SSE. Guide : [Diffusion](/fr/guides/realtime/broadcasting), [Hubs](/fr/guides/realtime/hubs) · [Référence](/fr/reference/relay)

## Mobile

- **`@c9up/orbit`** : Des composants aurora rendus en vues natives sur un téléphone, mis en page et comparés par un hôte Rust. Guide : [Introduction](/fr/guides/mobile/introduction) · [Référence](/fr/reference/orbit)
- **`@c9up/orbit-clipboard`** : Le presse-papiers du système, avec les deux mêmes appels dans le navigateur et sur un téléphone. Guide : [API de l'appareil](/fr/guides/mobile/device-apis) · [Référence](/fr/reference/orbit-clipboard)
- **`@c9up/orbit-secure-store`** : Des chaînes conservées chiffrées sur le téléphone (Keystore d'Android), éventuellement derrière une vérification biométrique. Guide : [API de l'appareil](/fr/guides/mobile/device-apis) · [Référence](/fr/reference/orbit-secure-store)
- **`@c9up/robledo`** : Des mises à jour à distance pour le build mobile d'une app ream, signées par `ream android:publish`, servies par l'app, vérifiées sur le téléphone et annulées quand elles n'atteignent jamais leur premier écran. Guide : [Mises à jour à distance](/fr/guides/mobile/building#mises-a-jour-a-distance) · [Référence](/fr/reference/robledo)

## Services

- **`@c9up/archive`** : Le stockage de fichiers sur des disques nommés : un driver local avec URL signées par HMAC, et des drivers compatibles S3 et Google Cloud Storage, derrière un même contrat. Guide : [Drive](/fr/guides/digging-deeper/drive) · [Référence](/fr/reference/archive)
- **`@c9up/atom`** : Arithmétique décimale exacte, statistiques et montants liés à une devise, sur un moteur Rust avec un repli TypeScript. Guide : [Décimaux et montants](/fr/guides/digging-deeper/decimals) · [Référence](/fr/reference/atom)
- **`@c9up/bay`** : Les tâches de fond : des classes de job envoyées sur des files nommées et exécutées par un worker, avec des drivers mémoire et Redis derrière un même contrat. Guide : [Files d'attente](/fr/guides/digging-deeper/queues) · [Référence](/fr/reference/bay)
- **`@c9up/chronos`** : Dates, durées, intervalles, règles de récurrence et jours fériés, sur un moteur Rust qui gère les fuseaux horaires, l'analyse et le formatage. Guide : [Dates](/fr/guides/digging-deeper/dates) · [Référence](/fr/reference/chronos)
- **`@c9up/echo`** : Un cache à stores nommés, sur une ou deux couches (mémoire, Redis), avec périodes de grâce, délais, factories à vol unique et tags. Guide : [Cache](/fr/guides/digging-deeper/cache) · [Référence](/fr/reference/echo)
- **`@c9up/eclipse`** : Des verrous distribués : une clé, un détenteur, avec des magasins mémoire, Redis et base SQL derrière un même contrat. Guide : [Verrous](/fr/guides/digging-deeper/locks) · [Référence](/fr/reference/eclipse)
- **`@c9up/goldstone`** : La lecture d'e-mails pour ream : des boîtes IMAP (surveillées en temps réel avec IDLE) et le courrier entrant que les fournisseurs postent sur un webhook, chaque message analysé comme une entrée hostile, son HTML assaini et son expéditeur vérifié (DKIM, SPF, DMARC, ARC). L'envoi reste à [rover](/fr/reference/rover). [Référence](/fr/reference/goldstone)
- **`@c9up/nova`** : Les notifications Web Push pour ream : signature VAPID, envoi chiffré aux services push des navigateurs, une route d'abonnement et un service worker prêt à l'emploi. Guide : [Notifications push](/fr/guides/digging-deeper/push/) · [Référence](/fr/reference/nova)
- **`@c9up/parsec`** : Les métriques : compteurs, jauges et histogrammes derrière un même contrat de driver, avec un driver Prometheus sans dépendance, un driver OpenTelemetry, un middleware HTTP et un point de collecte protégé. Guide : [Métriques](/fr/guides/digging-deeper/metrics) · [Référence](/fr/reference/parsec)
- **`@c9up/prism`** : Le traitement d'images pour ream sur un moteur Rust : inspecter, redimensionner, recadrer, pivoter, superposer, filigraner, filtrer et convertir des images, servir des variantes responsives, dessiner des QR codes et des bulletins QR suisses. Guide : [Images](/fr/guides/digging-deeper/images/) · [Référence](/fr/reference/prism)
- **`@c9up/rosetta`** : Internationalisation : catalogues de traduction avec messages ICU, négociation de la locale et replis, mise en forme `Intl` des nombres, dates et listes, détection de la locale de la requête et clés de traduction typées. Guide : [I18n](/fr/guides/digging-deeper/i18n) · [Référence](/fr/reference/rosetta)
- **`@c9up/rover`** : L'envoi d'e-mails pour ream, par SMTP, le mailer de log ou l'API HTTP d'un fournisseur (SES, Mailgun, SendGrid, Resend, Brevo, SparkPost), avec templates, nouvelles tentatives, envoi en file et webhooks de distribution. Guide : [E-mail](/fr/guides/digging-deeper/mail/) · [Référence](/fr/reference/rover)
- **`@c9up/spectrum`** : Journalisation structurée, avec loggers nommés, loggers enfants, masquage, sérialiseurs et canaux console ou fichier. Guide : [Logger](/fr/guides/digging-deeper/logger/) · [Référence](/fr/reference/spectrum)
- **`@c9up/station`** : Un panneau d'administration pour une application ream, construit à partir d'un catalogue déclaratif de ressources (`defineResource`) qui monte les routes de liste, d'affichage, de création, de modification et de suppression sous `/admin`, derrière une connexion, des permissions par action, des vérifications CSRF et une piste d'audit. Guide : [Panneau d'administration](/fr/guides/digging-deeper/admin/) · [Référence](/fr/reference/station)
- **`@c9up/vellum`** : Une boîte à outils PDF sur un moteur Rust : rendre des pages en images, lire le texte, les métadonnées et les formulaires, fusionner, découper, pivoter et tamponner des documents, remplir et aplatir des formulaires, signer et vérifier des signatures, et créer de nouveaux documents avec `PdfDocument`. Guide : [PDF](/fr/guides/digging-deeper/pdf/) · [Référence](/fr/reference/vellum)

## Tests et outils

- **`@c9up/helix`** : Le lanceur de tests : une CLI `helix test` qui exécute chaque fichier dans son propre worker, un DSL `test` / `describe` avec un contexte de test injecté, les assertions `expect` et `assert`, les mocks `vi`, la surcharge du conteneur et une horloge figée. Guide : [Le lanceur de tests](/fr/guides/testing/runner) · [Référence](/fr/reference/helix)
- **`@c9up/helix-plugin-ream`** : Le pont entre une app ream et le lanceur de tests helix : un plugin qui place un client de test HTTP sur le contexte de chaque test, et le lanceur derrière `ream test`. Guide : [Tests HTTP](/fr/guides/testing/http-tests) · [Référence](/fr/reference/helix-plugin-ream)
- **`@c9up/ream-mcp`** : Un serveur Model Context Protocol sur stdio qui permet à un agent de code de chercher dans la documentation du projet, d'inspecter ses routes et ses providers, de générer du code, de lancer les migrations et de rechercher des failles de sécurité. Guide : [Agents IA (MCP)](/fr/guides/digging-deeper/mcp) · [Référence](/fr/reference/ream-mcp)
