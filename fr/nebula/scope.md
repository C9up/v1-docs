# Ce qui est plus étroit que shadcn

Chaque composant du registre de shadcn a une contrepartie ici, et la quarantaine de composants simples sont fidèles jusqu'aux chaînes de classes, aux variantes et aux attributs ARIA. Ceux que shadcn construit en enveloppant une bibliothèque tierce sont des réimplémentations, donc plus étroites. Dit franchement, parce que « portage complet » serait faux :

| Composant | shadcn | nebula |
|---|---|---|
| [Chart](/fr/nebula/components/chart) | Recharts, en entier | courbe, aire et barres sur un axe catégoriel |
| [DataTable](/fr/nebula/components/data-table) | TanStack Table (groupes de colonnes, virtualisation, épinglage, filtres à facettes, côté serveur) | tri, filtre, pagination, sélection — en mémoire |
| [Sidebar](/fr/nebula/components/sidebar) | ~15 parties | les parties qui ne sont pas des atomes re-habillés |
| [Carousel](/fr/nebula/components/carousel) | embla (boucle, défilement auto, N vues) | scroll-snap, une vue, ni boucle ni défilement auto |
| [Toaster](/fr/nebula/components/toaster) | le manager de Base UI (priorité d'affichage, toasts ancrés, payload typée) — ou sonner, avec six positions | cinq variantes, toasts sur promesse, update et dédup par id, action, `onClose`, pause au survol, quatre coins |
| [Resizable](/fr/nebula/components/resizable) | imbrication libre, dispositions persistées, repli à zéro | deux volets, une poignée |
| [Combobox](/fr/nebula/components/combobox) | simple, multi-sélection et création | sélection simple |
| [ScrollArea](/fr/nebula/components/scroll-area) | barres redessinées par Radix | barres natives, stylées |
| [Calendar](/fr/nebula/components/calendar) | react-day-picker, tous les modes | date simple et intervalle ; ni multi-mois ni multi-sélection |
| [Questionnaire](/fr/nebula/components/questionnaire) | logique de branchement, schémas de validation | étapes linéaires ; simple, multiple, libre, sautable |

Deux entrées de shadcn n'ont volontairement pas de contrepartie directe. `DirectionProvider` serait une seconde source de vérité pour ce que le style calculé dit déjà — voir [de droite à gauche](/fr/nebula/languages#de-droite-a-gauche). `Form` a été fondu dans `Field` en amont ; nebula livre les deux, `Form` branchant le contrôleur de formulaires d'Aurora.

**Le Sidebar mérite sa note**, parce que le porter partie par partie aurait combattu la taxonomie atomique au lieu de la suivre. `SidebarInput`, `SidebarSeparator` et `SidebarMenuSkeleton` sont les atomes `Input`, `Separator` et `Skeleton` avec un préfixe — les redéclarer casserait la règle de composition sur laquelle toute la bibliothèque est rangée. `SidebarProvider` est du contexte React, et le sidebar de nebula possède son propre signal partagé. `SidebarInset` est la colonne de contenu à côté du rail, c'est-à-dire `AppShell`, un template. Ce qui manquait vraiment et a été ajouté : `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuAction`, un emplacement de badge, et les infobulles quand le rail est replié.

Certains composants vont dans l'autre sens et n'ont aucune contrepartie chez shadcn : [PieceMap](/fr/nebula/components/piece-map), [Image](/fr/nebula/components/image) et [Picture](/fr/nebula/components/picture).
