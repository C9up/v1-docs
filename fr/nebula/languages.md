# Langues et sens de lecture

## Libellés dans votre langue

Tout texte qu'un composant écrit de lui-même peut être remplacé, et la plupart ne sont lus que par un lecteur d'écran : une croix de fermeture, une flèche de page, le nom d'un repère. Restés en anglais, ils font changer de langue un lecteur d'écran au milieu d'une page en français, pour les utilisateurs qui justement ne la voient pas. Chacun est une prop, dont la valeur par défaut est l'anglais du modèle :

| Composant | Props |
|---|---|
| `DialogContent`, `SheetContent`, `Sidebar` (feuille mobile) | `closeLabel` |
| `DialogFooter` (`showCloseButton`) | `closeLabel` |
| `SidebarTrigger`, `SidebarRail` | `label` |
| `Pagination`, `Breadcrumb` | `aria-label` |
| `PaginationPrevious`, `PaginationNext` | `aria-label`, et `children` pour le mot visible (la flèche reste) |
| `PaginationEllipsis`, `BreadcrumbEllipsis` | `label` |
| `DataTable` | `selectAllLabel`, `selectRowLabel(row)`, `paginationLabels`, `filterLabel` |
| `Calendar` | `labels: { previousMonth, nextMonth }` |
| `DatePicker`, `DateRangePicker` | `labels: { dialog, previousMonth, nextMonth }` |
| `Carousel` | `label`, `roleDescription` |
| `CarouselItem` | `roleDescription`, `label(position, count)` |
| `CarouselPrevious`, `CarouselNext` | `label` |
| `InputOTP` | `slotLabel(position, length)` |
| `ResizableHandle` | `label` |
| `Questionnaire` | `progressLabel`, `counterLabel(position, total)` |
| `SettingsLayout` | `navLabel` |
| `Toaster` | `closeButtonAriaLabel` |
| `Sidebar` (repère sur ordinateur et titre de la feuille mobile) | `label` |
| `Spinner` | `label` (`"Loading"`) |
| `Bubble` | `expandLabel`, `collapseLabel` |
| `MessageScroller` | `label`, `jumpLabel` |
| `Questionnaire` (boutons) | `backLabel`, `nextLabel`, `skipLabel`, `submitLabel` |
| `SelectTrigger` | `label`, ou un `id` vers lequel pointe un `FieldLabel` |

Les noms des mois et des jours n'en ont pas besoin : `Calendar` les formate avec `Intl`, dans sa `locale`. Les libellés sont des props plutôt qu'un réglage donné une fois, parce qu'un serveur qui rend les pages de deux visiteurs dans deux langues n'a pas de réglage unique à donner.

## De droite à gauche

Il n'y a pas de `DirectionProvider`. La direction est déjà sur la page — `<html dir="rtl">`, un attribut `dir` sur un panneau, une feuille de style qui pose `direction` — et le style calculé répond à chacun d'eux. Un fournisseur serait une seconde source de vérité qui contredirait la première sans rien dire, donc nebula lit le style calculé partout où il doit savoir dans quel sens on avance. Les flèches gauche et droite de `Tabs`, `Toolbar` et `Accordion` le suivent, et les contrôles natifs — un `RadioGroup`, un `Slider` — sont reflétés par le navigateur lui-même. Pas encore : les flèches des sous-menus et de la barre de menus, `Calendar`, `InputOTP` et `Carousel` lisent <kbd>ArrowLeft</kbd> et <kbd>ArrowRight</kbd> physiquement.

Le moteur de placement se reflète de la même façon. Les placements s'écrivent physiquement — `"right-start"` pour un sous-menu — parce que c'est ce qui se lit clairement à l'appel, et `resolvePosition` les retourne quand l'ancre calcule `direction: rtl`. `autoPosition` le relit sur l'ancre à chaque mise à jour, donc aucun composant ne passe de drapeau et un changement de langue en cours de session déplace les surfaces ouvertes avec lui.

Le miroir n'est pas symétrique, et c'est la part qu'il faut connaître : pour `left`/`right` c'est le *côté* qui permute et l'alignement ne bouge pas ; pour `top`/`bottom` le côté reste et c'est l'*alignement* qui permute. Refléter les deux moitiés de `bottom-start` le ramènerait à son point de départ.

Les composants utilisent les propriétés logiques (`ms-*`, `me-*`, `start-*`, `end-*`) partout où un côté s'entend relativement au texte. Là où un côté est un vrai choix de mise en page — par quel bord un `Sheet` entre, quel côté un `Sidebar` occupe — il reste physique, parce que c'est ce que le code appelant veut dire.
