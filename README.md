# combinaisons-actions

Combinaisons d'actions de l'**EN 1990:2002** pour les bâtiments (annexe A1) : ELU EQU, STR/GEO,
GEO et accidentelles, ELS caractéristiques, fréquentes et quasi permanentes. Export **CSV** et
**Excel**, note de calcul imprimable.

Fait partie de la suite [Aedificium web](https://henri421.github.io/WebAedificium/).
Page publiée : <https://henri421.github.io/combinaisons-actions/>.

> **Aide au calcul. L'outil constate, il ne prescrit pas** : il forme les combinaisons, il ne
> choisit pas celle qui gouverne. Valeurs recommandées de l'EN 1990:2002, sans annexe nationale.
> La vérification finale incombe à l'ingénieur du projet.

## Ce que l'outil rend

- **Actions** permanentes (avec l'option « peut être favorable », qui forme aussi les
  combinaisons à γ_G,inf), variables (catégories du tableau A1.1 : A à H, neige, vent,
  température) et accidentelles.
- **Groupes d'exclusion** : deux actions du même groupe ne sont jamais combinées ensemble (les
  cas de vent entre eux, les cas de neige entre eux).
- **Combinaisons** :
  - ELU STR/GEO par (6.10), ou par (6.10a) et (6.10b) avec ξ = 0,85 ;
  - ELU EQU, jeu A (γ_G,sup = 1,10, γ_G,inf = 0,90) ;
  - ELU GEO, jeu C (approches 1 et 3) ;
  - ELU accidentelles (6.11b), dominante à ψ₁ ou ψ₂ ;
  - ELS (6.14b), (6.15b), (6.16b).
- Chaque action variable domine tour à tour. Les doublons (coefficients identiques, par exemple
  quand ψ = 0) sont fusionnés.
- **Règle A1.2.1(3)** : la charge de toit (catégorie H) ne se combine ni avec la neige ni avec le
  vent.
- **Effets** (facultatif) : une valeur par action et par effet (N, M, V...) ; l'outil rend les
  valeurs combinées et leur **enveloppe** max / min par famille, avec la combinaison qui la donne.
  Un effet manquant rend la valeur combinée inconnue, jamais nulle.
- **Import** du fichier « Actions (JSON) » de [charges-climatiques](https://henri421.github.io/charges-climatiques/) :
  chaque cas de neige et de vent devient une action variable, dans son groupe.

## Sorties

- **CSV** (point-virgule, virgule décimale, BOM) : une ligne par combinaison, une colonne par
  action (son coefficient), puis les effets combinés.
- **Excel** (.xlsx) : un onglet par famille, un onglet des actions, un des enveloppes. Classeur
  écrit sans bibliothèque (archive ZIP non compressée).
- **Note de calcul** HTML imprimable : les mêmes tableaux que l'écran, produits par les mêmes
  fonctions.

## Hors périmètre

Combinaisons sismiques (6.12b), précontrainte, ponts (annexe A2), annexes nationales (profil
dérivable, non codé). EN 1990:2023 : prévu dans le chantier « 2ᵉ génération » de la suite.

## Développement

```bash
npm install
npm run typecheck
npm test
npm run build
```

Le noyau (`src/`) est pur et testé ; l'interface (`app/`) ne calcule rien.
