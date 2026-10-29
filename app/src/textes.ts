/**
 * Les textes affiches, en francais et en anglais. PUR.
 *
 * Deux sources :
 * - les textes de l'app (`FR`, `EN`), types : une cle oubliee en anglais ne
 *   compile pas ;
 * - les phrases du noyau (`src/`), ecrites en francais, traduites a
 *   l'affichage par `phrase`.
 *
 * ⚠ Aucun texte ne se lit au chargement d'un module : toujours `textes()` ou
 * `phrase()` AU MOMENT DU RENDU, apres `definirLangue` (main.ts).
 */

import { langueCourante, traducteur } from 'aedificium-ui';
import { LIBELLES_CATEGORIES, LIBELLES_FAMILLES, type Categorie, type Famille, type Options } from '../../src/index';

type Nature = 'permanente' | 'variable' | 'accidentelle';

const FR = {
  familles: LIBELLES_FAMILLES as Record<Famille, string>,
  categories: LIBELLES_CATEGORIES as Record<Categorie, string>,
  natures: { permanente: 'permanente', variable: 'variable', accidentelle: 'accidentelle' } as Record<Nature, string>,
  peutEtreFavorable: 'peut être favorable',
  entetes: {
    id: 'Id',
    nom: 'Nom',
    action: 'Action',
    nature: 'Nature',
    natureCategorie: 'Nature, catégorie',
    categorie: 'Catégorie',
    groupe: 'Groupe',
    jeu: 'Jeu',
    source: 'Source',
    famille: 'Famille',
    numero: 'N°',
    expression: 'Expr.',
    dominante: 'Dominante',
    combinaison: 'Combinaison',
    extremum: 'Extremum',
  },
  /** « — 3 combinaisons » */
  compte: (n: number) => `${n} combinaison${n > 1 ? 's' : ''}`,
  /** « (n° 4) » dans les enveloppes. */
  numero: (n: number) => `n° ${n}`,
  /** En-tete du numero d'un extremum dans le classeur : « M : n° ». */
  numeroDe: (effet: string) => `${effet} : n°`,
  aria: {
    champ: (champ: string, i: number) => `${champ}, action ${i}`,
    categorie: (i: number) => `catégorie, action ${i}`,
    nature: (i: number) => `nature, action ${i}`,
    retirer: (i: number) => `retirer l'action ${i}`,
  },
  feuilles: { actions: 'Actions', enveloppes: 'Enveloppes' },
  actionsParDefaut: {
    G: 'Poids propre et charges permanentes',
    Q: 'Exploitation, bureaux',
    S: 'Neige',
    W: 'Vent',
  },
  options: (o: Options): string[] => [
    o.formule === '6.10' ? "ELU STR/GEO par l'expression (6.10)." : 'ELU STR/GEO par la plus défavorable de (6.10a) et (6.10b).',
    o.equ ? 'ELU EQU (jeu A) formées.' : 'ELU EQU non formées.',
    o.geoC ? 'ELU GEO avec le jeu C formées (approches 1 et 3).' : 'ELU GEO avec le jeu C non formées.',
    o.accidentelle
      ? `Combinaisons accidentelles (6.11b), dominante à ${o.psiAccidentelle === 'psi1' ? 'psi_1' : 'psi_2'}.`
      : 'Combinaisons accidentelles non formées.',
    o.els ? 'Combinaisons de service formées.' : 'Combinaisons de service non formées.',
    o.variablesFavorables
      ? "Chaque groupe d'actions variables est aussi envisagé absent (action favorable)."
      : 'Toutes les actions variables sont supposées défavorables (présentes).',
  ],
  note: {
    hypotheses: [
      'EN 1990:2002, annexe A1 (bâtiments) : expressions (6.10), (6.10a), (6.10b), (6.11b), (6.14b), (6.15b), (6.16b).',
      "Les charges d'exploitation des toits (catégorie H) ne sont combinées ni avec la neige ni avec le vent (A1.2.1(3)).",
      "Deux actions d'un même groupe d'exclusion ne sont jamais simultanées.",
      'Valeurs combinées par superposition linéaire des effets saisis : valable pour une analyse linéaire seulement.',
      'Ni combinaisons sismiques (6.12b), ni actions de précontrainte, ni ponts (annexe A2).',
    ],
    element: "Combinaisons d'actions",
    norme: 'EN 1990:2002, annexe A1',
    profil: (nom: string, date: string) => `Profil normatif : ${nom}, données consultées le ${date}.`,
    coefficients: 'Coefficients partiels',
    actions: 'Actions',
    effets: 'Effets caractéristiques saisis',
    enveloppes: 'Enveloppes des effets',
  },
  messages: {
    identifiantVide: (i: number) => `Action ${i} : identifiant vide.`,
    categorieInconnue: (id: string) => `Action ${id} : catégorie inconnue.`,
    nombreAttendu: (id: string, effet: string, brut: string) => `Action ${id}, effet ${effet} : nombre attendu, reçu « ${brut} ».`,
    format: (recu: string, attendu: string) => `Fichier de format ${recu} : attendu ${attendu}.`,
    rienAExporter: 'Aucune combinaison valide à exporter : corriger la saisie.',
    nouvelleVersion: 'Une nouvelle version est disponible. Recharger maintenant ?',
  },
};

export type Textes = typeof FR;

const EN: Textes = {
  familles: {
    'ELU-EQU': 'ULS EQU, static equilibrium (Table A1.2(A))',
    'ELU-STR': 'ULS STR/GEO (Table A1.2(B))',
    'ELU-GEO': 'ULS GEO (Table A1.2(C))',
    'ELU-ACC': 'ULS accidental (6.11b)',
    'ELS-CAR': 'SLS characteristic (6.14b)',
    'ELS-FREQ': 'SLS frequent (6.15b)',
    'ELS-QP': 'SLS quasi-permanent (6.16b)',
  },
  categories: {
    A: 'Category A: domestic, residential areas',
    B: 'Category B: office areas',
    C: 'Category C: congregation areas',
    D: 'Category D: shopping areas',
    E: 'Category E: storage areas',
    F: 'Category F: traffic area, vehicles ≤ 30 kN',
    G: 'Category G: traffic area, vehicles from 30 to 160 kN',
    H: 'Category H: roofs',
    'neige-haute': 'Snow, altitude > 1000 m',
    neige: 'Snow, altitude ≤ 1000 m',
    vent: 'Wind',
    temperature: 'Temperature (non-fire)',
  },
  natures: { permanente: 'permanent', variable: 'variable', accidentelle: 'accidental' },
  peutEtreFavorable: 'may be favourable',
  entetes: {
    id: 'Id',
    nom: 'Name',
    action: 'Action',
    nature: 'Nature',
    natureCategorie: 'Nature, category',
    categorie: 'Category',
    groupe: 'Group',
    jeu: 'Set',
    source: 'Source',
    famille: 'Family',
    numero: 'No.',
    expression: 'Expr.',
    dominante: 'Leading',
    combinaison: 'Combination',
    extremum: 'Extremum',
  },
  compte: (n: number) => `${n} combination${n > 1 ? 's' : ''}`,
  numero: (n: number) => `no. ${n}`,
  numeroDe: (effet: string) => `${effet}: no.`,
  aria: {
    champ: (champ: string, i: number) => `${champ}, action ${i}`,
    categorie: (i: number) => `category, action ${i}`,
    nature: (i: number) => `nature, action ${i}`,
    retirer: (i: number) => `remove action ${i}`,
  },
  feuilles: { actions: 'Actions', enveloppes: 'Envelopes' },
  actionsParDefaut: {
    G: 'Self-weight and permanent loads',
    Q: 'Imposed load, offices',
    S: 'Snow',
    W: 'Wind',
  },
  options: (o: Options): string[] => [
    o.formule === '6.10' ? 'ULS STR/GEO from expression (6.10).' : 'ULS STR/GEO from the less favourable of (6.10a) and (6.10b).',
    o.equ ? 'ULS EQU (set A) generated.' : 'ULS EQU not generated.',
    o.geoC ? 'ULS GEO with set C generated (approaches 1 and 3).' : 'ULS GEO with set C not generated.',
    o.accidentelle
      ? `Accidental combinations (6.11b), leading action with ${o.psiAccidentelle === 'psi1' ? 'psi_1' : 'psi_2'}.`
      : 'Accidental combinations not generated.',
    o.els ? 'Serviceability combinations generated.' : 'Serviceability combinations not generated.',
    o.variablesFavorables
      ? 'Each group of variable actions is also considered absent (favourable action).'
      : 'All variable actions are taken as unfavourable (present).',
  ],
  note: {
    hypotheses: [
      'EN 1990:2002, Annex A1 (buildings): expressions (6.10), (6.10a), (6.10b), (6.11b), (6.14b), (6.15b), (6.16b).',
      'Imposed loads on roofs (category H) are combined neither with snow nor with wind (A1.2.1(3)).',
      'Two actions of the same exclusion group are never simultaneous.',
      'Combined values by linear superposition of the effects entered: valid for linear analysis only.',
      'No seismic combinations (6.12b), no prestressing actions, no bridges (Annex A2).',
    ],
    element: 'Combinations of actions',
    norme: 'EN 1990:2002, Annex A1',
    profil: (nom: string, date: string) => `Standard profile: ${nom}, data checked on ${date}.`,
    coefficients: 'Partial factors',
    actions: 'Actions',
    effets: 'Characteristic effects entered',
    enveloppes: 'Envelopes of effects',
  },
  messages: {
    identifiantVide: (i: number) => `Action ${i}: empty identifier.`,
    categorieInconnue: (id: string) => `Action ${id}: unknown category.`,
    nombreAttendu: (id: string, effet: string, brut: string) => `Action ${id}, effect ${effet}: number expected, got “${brut}”.`,
    format: (recu: string, attendu: string) => `File of format ${recu}: expected ${attendu}.`,
    rienAExporter: 'No valid combination to export: correct the input.',
    nouvelleVersion: 'A new version is available. Reload now?',
  },
};

/** Les textes de la langue courante. */
export function textes(): Textes {
  return langueCourante() === 'en' ? EN : FR;
}

// --- Phrases du noyau ----------------------------------------------------------

const EXACTES: Record<string, string> = {
  'EN 1990:2002, valeurs recommandées (bâtiments)': 'EN 1990:2002, recommended values (buildings)',
  'Plus de 10 actions permanentes pouvant être favorables : regrouper les actions permanentes.':
    'More than 10 permanent actions that may be favourable: group the permanent actions.',
  'Aucune action saisie.': 'No action entered.',
  "Une action n'a pas d'identifiant.": 'An action has no identifier.',
  'Combinaisons accidentelles demandées, mais aucune action accidentelle saisie.':
    'Accidental combinations requested, but no accidental action entered.',
  "Import : le fichier n'est pas un JSON lisible.": 'Import: the file is not readable JSON.',
};

/**
 * Traduit une phrase du noyau (profil, sources, erreurs, import, noms des
 * actions importees). En francais, la phrase sort intacte.
 */
export const phrase = traducteur(EXACTES, [
  [/^EN 1990:2002, valeur recommandée, tableau (.+)$/, 'EN 1990:2002, recommended value, Table $1'],
  [
    /^Plus de (\d+) combinaisons : réduire le nombre d'actions variables, les rassembler en groupes d'exclusion, ou décocher « actions variables favorables »\.$/,
    'More than $1 combinations: reduce the number of variable actions, put them in exclusion groups, or untick “variable actions favourable”.',
  ],
  [/^Identifiant d'action en double : (.+)\.$/, 'Duplicate action identifier: $1.'],
  [/^Import : (.+) attendu objet\.$/, 'Import: $1 expected to be an object.'],
  [/^Import : (.+) attendu tableau\.$/, 'Import: $1 expected to be an array.'],
  [/^Import : format (.+) inconnu \(attendu (.+)\)\.$/, 'Import: unknown format $1 (expected $2).'],
  [/^Neige non calculée : (.+)$/, 'Snow not calculated: $1'],
  [/^Vent non calculé : (.+)$/, 'Wind not calculated: $1'],
  [/^Neige — cas (\d+)$/, 'Snow — case $1'],
  [/^Vent — cas (\d+)$/, 'Wind — case $1'],
  [/^Neige — (.+)$/, 'Snow — $1'],
  [/^Vent — (.+)$/, 'Wind — $1'],
]);
