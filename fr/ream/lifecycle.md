# Lifecycle Applicatif

## Ordre d'execution

1. `register`
2. `boot`
3. `start`
4. `ready`
5. `shutdown`

## Regles pratiques

- `register`: bindings IoC, pas d'IO lourd
- `boot`: initialisation DB/bus/cache
- `start`: ouverture runtime HTTP/console
- `ready`: application servable
- `shutdown`: fermeture propre

## Recommandation

Tester explicitement le shutdown (SIGTERM/SIGINT) pour verifier la fermeture des ressources longues.
