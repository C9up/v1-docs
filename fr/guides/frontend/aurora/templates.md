# Templates

Ce guide couvre les templates aurora :

- Où un slot ne peut pas aller
- Les URL qui naviguent ou chargent du code

## Templates — `html`

Le tag `html` retourne un `TemplateResult`. Il ne touche pas au DOM par lui-même ; le rendu (`render`, `renderToString`, `hydrate`) est ce qui rattache le résultat quelque part.

```ts
import { html } from '@c9up/aurora'

const greeting = (name: string) => html`<p>Bonjour, ${name} !</p>`
```

Les emplacements dans les templates sont typés :

- **Slot texte** — `<p>${value}</p>` interpole une string, un nombre ou un signal en nœud texte.
- **Slot attribut** — `<a href="${url}">` pose un attribut ; si la valeur est un signal, l'attribut se re-render au changement. Un slot qui forme toute la valeur omet l'attribut pour `null`, `undefined` ou `false` et l'écrit vide pour `true`, côté serveur comme dans le navigateur ; mêlé à du texte fixe (`class="a ${x}"`), `null`, `undefined` et `false` n'ajoutent rien. Le serveur écrit entre guillemets toute valeur qui contient un slot, même quand le template la laisse sans guillemets : `title=${x}` avec un `x` vide donne `title=""`, jamais `title=` suivi de l'attribut d'après. Mettez quand même vos valeurs entre guillemets, comme les exemples de ce guide.
- **Slot propriété** — `<input .value="${signal}">` (préfixe pointé) écrit une propriété DOM.
- **Attribut booléen** — `<button ?disabled="${signal}">` toggle la présence de l'attribut.
- **Slot événement** — `<button @click="${handler}">` ajoute un écouteur.
- **Template imbriqué** — voir l'exemple ci-dessous.

  ```ts
  html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`
  ```

Les templates sont cachés par leur tableau de strings statiques, le re-rendu du même template est donc bon marché.

### Où un slot ne peut pas aller

Un slot est échappé pour la position où il atterrit. Cinq positions n'ont aucun
échappement qui les rendrait sûres : elles sont refusées nommément, avec la même
erreur depuis `renderToString`, `render` et `hydrate` — parce que les deux chemins
de rendu divergeaient et livraient chacun un bug différent.

| Refusé | Code | Pourquoi, et quoi écrire à la place |
|---|---|---|
| `<${tag}>` | `E_AURORA_SLOT_IN_TAG_NAME` | Le template se compile une fois en fragment et un slot est une position de nœud ; un nom de balise n'en est pas une. Écrivez la balise, ou choisissez entre deux templates. |
| `<img ${name}="v">` | `E_AURORA_SLOT_IN_ATTRIBUTE_NAME` | Même raison. Écrivez l'attribut et liez sa valeur. |
| `<!-- ${x} -->`, `<!x ${x}>`, `<?${x}>`, `<![CDATA[${x}]]>` | `E_AURORA_SLOT_IN_COMMENT` | Un slot n'y lie rien, et le commentaire avec lequel aurora ancre un slot texte terminerait trop tôt celui de l'auteur, dont la suite deviendrait du markup. Sortez le slot du commentaire. Les commentaires se terminent là où le navigateur les termine : `<!-->` et `<!--->` aussitôt, `--!>` comme `-->` ; `<!x …`, `<?…` et `</ …` au premier `>`, guillemets ou non ; et un `<` qui n'est pas suivi d'une lettre, de `/`, `!` ou `?` est du texte. |
| `onclick="${code}"` | `E_AURORA_SLOT_IN_EVENT_ATTRIBUTE` | Cette valeur est du JavaScript ; l'échapper en HTML ne l'empêche pas de s'exécuter. Utilisez `@click="${handler}"`, qui lie une fonction. |
| `srcdoc="${doc}"` | `E_AURORA_SLOT_IN_SRCDOC` | L'iframe décode la valeur et la parse comme un document entier. Pointez-la vers une URL que vous servez. |
| `<script src="${url}">`, `.src` sur un script, `href`/`xlink:href` sur un script SVG | `E_AURORA_SLOT_IN_SCRIPT_SOURCE` | Ce que l'URL désigne s'exécute avec l'autorité de la page — `https://` sur une autre origine et `blob:` compris — et aucun contrôle de la valeur ne distingue le script voulu de celui que la valeur a choisi. Écrivez l'URL dans le template ; un script choisi à l'exécution relève du code qui crée l'élément. |
| `<script>`, `<style>`, `<textarea>`, `<title>`… | `E_AURORA_SLOT_IN_RAW_TEXT` | Le parseur ne lit pas leur contenu comme du markup. Pour `<textarea>` et `<title>` le contenu EST du texte, mais les commentaires avec lesquels aurora ancre un slot en feraient partie — liez la propriété : `<textarea .value="${value}">`. Pour les autres, construisez la valeur hors du template. `<plaintext>` n'a pas de balise de fin, donc tout slot placé après est refusé. Un `/` ne ferme pas un élément HTML — `<script/>` ouvre un script comme `<script>`. |
| `.text`, `.textContent`, `.innerText` sur `<script>` ou `<style>` | `E_AURORA_SLOT_IN_RAW_TEXT` | La version propriété d'un slot à l'intérieur de l'élément : elle écrit la source que le navigateur exécute. |
| `.innerHTML`, `.outerHTML`, `.srcdoc` | `E_AURORA_SLOT_IN_HTML_PROPERTY` | Ces propriétés parsent leur valeur comme du HTML, gestionnaires compris. Mettez le contenu dans un slot texte, ou passez un template `html` imbriqué. |
| Un template `` html`…` `` imbriqué (ou un tableau qui en contient un) comme valeur d'attribut ou de `.value` | `E_AURORA_TEMPLATE_IN_ATTRIBUTE` | Du markup n'a pas de sens dans un attribut. Passez une chaîne — pour une prop typée `string \| TemplateResult`, liez sa forme texte à `title`/`aria-label`. |

aurora lit un template comme le tokenizer du navigateur, donc un refus vaut pour
toutes les écritures valides :

- Des espaces autour du `=` ne cachent pas l'attribut : `href ="${url}"`,
  `href= "${url}"` et `href = ${url}` désignent tous `href`. Ils sont protégés ou
  refusés comme `href="${url}"`.
- Un `/` termine un nom de balise ou d'attribut : `<script/x>` est un script,
  `x/href` donne `x` puis `href`. Un `=` placé au début d'un nom fait partie du
  nom, donc `<img ='${v}'>` est un slot dans un nom d'attribut.
- Un `<script>` se termine là où le navigateur le termine. Après `<!--<script>`
  dans un script, le premier `</script>` ne le termine pas.
- Dans le navigateur, les noms sont vérifiés une seconde fois sur le template
  parsé.

Dans `<svg>` et `<math>` les règles raw-text sont suspendues, le parseur ne
changeant jamais d'état en contenu étranger — `<svg><title>${label}</title></svg>`
est un slot texte ordinaire. Deux choses y restent vraies :

- Un `<script>` ou un `<style>` **exécute son contenu** en SVG et en MathML aussi,
  donc un slot à l'intérieur est refusé où qu'il soit.
- Les règles HTML reprennent à un **point d'intégration HTML** — `foreignObject`,
  `desc` et `title` en SVG ; `mi`, `mo`, `mn`, `ms`, `mtext` et `annotation-xml`
  en MathML — et après une balise HTML qui met fin au contenu étranger (`<p>`,
  `<div>`, `<br>`, `<span>`, `<table>`…), que le parseur lit comme du HTML quelle
  que soit l'imbrication du markup.

**`.value` est la seule propriété que le serveur rend.** Les liaisons `.prop` sont
client-only — il n'y a pas de markup pour `textContent` — mais un `<input>` porte
sa valeur en attribut et un `<textarea>` en contenu, donc les deux sont écrites :

```ts
html`<input name="title" .value="${title}">`      // → <input name="title" value="Draft">
html`<textarea name="bio" .value="${bio}">`       // → <textarea name="bio">Bio</textarea>
```

C'est ce qui rend le refus ci-dessus praticable : un formulaire rendu côté serveur
arrive rempli, et un envoi avant hydratation transmet bien les valeurs.

Un `<input type="file">` fait exception : un script ne peut que le vider. Une
`.value` non vide y lève `E_AURORA_FILE_INPUT_VALUE` au rendu serveur, au rendu
client et à l'hydratation, où que `type` soit écrit dans la balise ; liez `""`
pour réinitialiser le champ.

### Les URL qui naviguent ou chargent du code

`href`, `xlink:href`, `action` et `formaction` sont contrôlés sur tout élément, et
`src` sur `<iframe>`, `<frame>` et `<embed>`, `data` sur `<object>` — les éléments
qui exécutent ce qu'ils chargent. L'URL d'un `<script>` ne prend aucun slot (voir
plus haut). Une valeur dont le schéma
s'exécuterait — `javascript:`, `vbscript:`, `data:` — est préfixée par
`unsafe:` plutôt que rejetée. Une URL dans un `href` est le plus souvent une
donnée, et lever là échangerait un XSS contre une page blanche ; l'attribut reste
en place, inerte, et lisible pour qui vient regarder.

C'est la valeur entière qui est jugée, pas chaque slot : `href="java${'script:alert(1)'}"`
est sûr dans chaque moitié et devient un script exécuté une fois les deux réunies.
`src` sur une `<img>`, une `<video>` ou une `<source>` n'est pas touché, une URI
`data:` étant la façon d'écrire une image inline et cette position n'exécutant
rien.

Une liaison `.prop` reçoit le même contrôle : `.href`, `.src`, `.action`,
`.formAction` et `.data` sont neutralisés partout où l'attribut qu'ils écrivent le
serait.

Deux autres positions naviguent sans `href` :

- `to`, `from`, `by` et `values` sur un `<set>` ou un `<animate>` SVG —
  `<set attributeName="href" to="javascript:…">` donne à un lien une cible
  qu'aucun `href` ne portait. Ils sont contrôlés quoi que l'animation modifie,
  `attributeName` pouvant venir plus loin dans la balise ; dans `values`, chaque
  élément séparé par `;` l'est.
- `content` sur une `<meta>`, quand il se lit comme un rafraîchissement
  (`0;url=…`) : la cible est contrôlée et la valeur entière préfixée, ce qui
  arrête le rafraîchissement. Une description ou un viewport ne sont pas touchés.

Un slot dans `<base href>` (ou `.href` sur une `<base>`) est refusé avec
`E_AURORA_SLOT_IN_BASE_URL` : il rebase toutes les URL relatives de la page,
scripts chargés compris, et aucun contrôle de schéma ne couvre une base sur une
autre origine.
