/**
 * Profil normatif des combinaisons : coefficients partiels et coefficients
 * psi que l'annexe nationale peut fixer.
 *
 * AUCUNE valeur nationale n'est codee dans le noyau. Le profil par defaut est
 * celui des valeurs RECOMMANDEES de l'EN 1990:2002, annexe A1 (batiments),
 * pas celui d'un pays. Chaque valeur porte sa source : une valeur dont la
 * provenance est inconnue BLOQUE le calcul (`verifierProfil`).
 *
 * Grandeurs sans dimension.
 */

export interface ValeurSourcee {
  valeur: number;
  source: string;
}

/** Les trois coefficients psi d'une categorie d'action variable. */
export interface Psi {
  psi0: ValeurSourcee;
  psi1: ValeurSourcee;
  psi2: ValeurSourcee;
}

/**
 * Categories du tableau A1.1. `neige-haute` : sites a plus de 1000 m
 * d'altitude (et pays nordiques) ; `neige` : sites a 1000 m au plus.
 */
export type Categorie =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'neige-haute'
  | 'neige'
  | 'vent'
  | 'temperature';

export const CATEGORIES: readonly Categorie[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'neige-haute', 'neige', 'vent', 'temperature',
];

/** Un jeu de coefficients partiels (tableaux A1.2(A), (B), (C)). */
export interface JeuGamma {
  gammaGSup: ValeurSourcee;
  gammaGInf: ValeurSourcee;
  gammaQ: ValeurSourcee;
}

export interface ProfilCombinaisons {
  nom: string;
  date: string;
  psi: Record<Categorie, Psi>;
  /** EQU, tableau A1.2(A). */
  jeuA: JeuGamma;
  /** STR/GEO, tableau A1.2(B). */
  jeuB: JeuGamma;
  /** GEO, tableau A1.2(C). */
  jeuC: JeuGamma;
  /** Coefficient de reduction des permanentes defavorables, expression (6.10b). */
  xi: ValeurSourcee;
}

/**
 * Verifie que chaque valeur du profil est un nombre fini et porte une source.
 * Leve en nommant la premiere valeur fautive.
 */
export function verifierProfil(p: ProfilCombinaisons): void {
  const controler = (chemin: string, v: ValeurSourcee): void => {
    if (!Number.isFinite(v.valeur)) throw new Error(`Profil : ${chemin} n est pas un nombre.`);
    if (v.source.trim() === '') throw new Error(`Profil : ${chemin} n a pas de source ; une valeur sans provenance bloque le calcul.`);
  };
  for (const c of CATEGORIES) {
    const psi = p.psi[c];
    controler(`psi0 (${c})`, psi.psi0);
    controler(`psi1 (${c})`, psi.psi1);
    controler(`psi2 (${c})`, psi.psi2);
  }
  for (const [nom, jeu] of [['A', p.jeuA], ['B', p.jeuB], ['C', p.jeuC]] as const) {
    controler(`gamma_G,sup (jeu ${nom})`, jeu.gammaGSup);
    controler(`gamma_G,inf (jeu ${nom})`, jeu.gammaGInf);
    controler(`gamma_Q (jeu ${nom})`, jeu.gammaQ);
  }
  controler('xi', p.xi);
}

const SOURCE = 'EN 1990:2002, valeur recommandee';

function psi(psi0: number, psi1: number, psi2: number): Psi {
  const source = `${SOURCE}, tableau A1.1`;
  return { psi0: { valeur: psi0, source }, psi1: { valeur: psi1, source }, psi2: { valeur: psi2, source } };
}

function jeu(tableau: string, gammaGSup: number, gammaGInf: number, gammaQ: number): JeuGamma {
  const source = `${SOURCE}, tableau ${tableau}`;
  return {
    gammaGSup: { valeur: gammaGSup, source },
    gammaGInf: { valeur: gammaGInf, source },
    gammaQ: { valeur: gammaQ, source },
  };
}

/** Valeurs recommandees de l'EN 1990:2002, annexe A1 (batiments). */
export function en1990Recommande(): ProfilCombinaisons {
  return {
    nom: 'EN 1990:2002, valeurs recommandees (batiments)',
    date: '2026-10-23',
    psi: {
      A: psi(0.7, 0.5, 0.3),
      B: psi(0.7, 0.5, 0.3),
      C: psi(0.7, 0.7, 0.6),
      D: psi(0.7, 0.7, 0.6),
      E: psi(1.0, 0.9, 0.8),
      F: psi(0.7, 0.7, 0.6),
      G: psi(0.7, 0.5, 0.3),
      H: psi(0, 0, 0),
      'neige-haute': psi(0.7, 0.5, 0.2),
      neige: psi(0.5, 0.2, 0),
      vent: psi(0.6, 0.2, 0),
      temperature: psi(0.6, 0.5, 0),
    },
    jeuA: jeu('A1.2(A)', 1.1, 0.9, 1.5),
    jeuB: jeu('A1.2(B)', 1.35, 1.0, 1.5),
    jeuC: jeu('A1.2(C)', 1.0, 1.0, 1.3),
    xi: { valeur: 0.85, source: `${SOURCE}, tableau A1.2(B), note 2` },
  };
}

/** Libelles des categories, tels qu'ils s'affichent. */
export const LIBELLES_CATEGORIES: Record<Categorie, string> = {
  A: 'Categorie A : habitation, residentiel',
  B: 'Categorie B : bureaux',
  C: 'Categorie C : lieux de reunion',
  D: 'Categorie D : commerces',
  E: 'Categorie E : stockage',
  F: 'Categorie F : vehicules ≤ 30 kN',
  G: 'Categorie G : vehicules de 30 a 160 kN',
  H: 'Categorie H : toits',
  'neige-haute': 'Neige, altitude > 1000 m',
  neige: 'Neige, altitude ≤ 1000 m',
  vent: 'Vent',
  temperature: 'Temperature (hors incendie)',
};
