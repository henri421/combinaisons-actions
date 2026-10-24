/**
 * Generation des combinaisons d'actions de l'EN 1990:2002 (§6.4.3, §6.5.3,
 * annexe A1 pour les batiments).
 *
 * Le module constate des combinaisons : il ne choisit pas celle qui
 * gouverne, faute de connaitre le signe des effets. C'est l'enveloppe des
 * valeurs (`valeurs.ts`) qui le dit, quand l'utilisateur fournit les effets
 * de chaque action.
 *
 * Grandeurs sans dimension (coefficients).
 */

import type { Categorie, JeuGamma, ProfilCombinaisons } from './profil';
import { verifierProfil } from './profil';

export interface ActionPermanente {
  id: string;
  nom: string;
  nature: 'permanente';
  /**
   * `true` : l'action peut etre favorable, et les combinaisons ELU sont
   * aussi formees avec gamma_G,inf (§6.4.3.2(3), tableau A1.2 note 3).
   */
  peutEtreFavorable: boolean;
}

export interface ActionVariable {
  id: string;
  nom: string;
  nature: 'variable';
  categorie: Categorie;
  /**
   * Groupe d'exclusion : deux actions du meme groupe ne sont jamais
   * simultanees (les cas de vent entre eux, par exemple). Vide : groupe
   * propre a l'action.
   */
  groupe?: string;
}

export interface ActionAccidentelle {
  id: string;
  nom: string;
  nature: 'accidentelle';
}

export type Action = ActionPermanente | ActionVariable | ActionAccidentelle;

export type Famille = 'ELU-EQU' | 'ELU-STR' | 'ELU-GEO' | 'ELU-ACC' | 'ELS-CAR' | 'ELS-FREQ' | 'ELS-QP';

export const FAMILLES: readonly Famille[] = ['ELU-EQU', 'ELU-STR', 'ELU-GEO', 'ELU-ACC', 'ELS-CAR', 'ELS-FREQ', 'ELS-QP'];

export const LIBELLES_FAMILLES: Record<Famille, string> = {
  'ELU-EQU': 'ELU EQU, equilibre statique (tableau A1.2(A))',
  'ELU-STR': 'ELU STR/GEO (tableau A1.2(B))',
  'ELU-GEO': 'ELU GEO (tableau A1.2(C))',
  'ELU-ACC': 'ELU accidentelle (6.11b)',
  'ELS-CAR': 'ELS caracteristique (6.14b)',
  'ELS-FREQ': 'ELS frequente (6.15b)',
  'ELS-QP': 'ELS quasi permanente (6.16b)',
};

export interface Options {
  /** `6.10` : une expression ; `6.10ab` : la plus defavorable de (6.10a) et (6.10b). */
  formule: '6.10' | '6.10ab';
  /** Combinaisons EQU (jeu A). */
  equ: boolean;
  /** Combinaisons GEO avec le jeu C (approches 1 et 3). */
  geoC: boolean;
  /** Combinaisons accidentelles (une par action accidentelle). */
  accidentelle: boolean;
  /** Coefficient de l'action variable dominante en accidentelle (6.11b). */
  psiAccidentelle: 'psi1' | 'psi2';
  /** Combinaisons de service. */
  els: boolean;
  /**
   * `true` : chaque groupe d'actions variables peut aussi etre ABSENT
   * (action favorable, gamma = 0). Multiplie le nombre de combinaisons.
   */
  variablesFavorables: boolean;
}

export const OPTIONS_PAR_DEFAUT: Options = {
  formule: '6.10',
  equ: true,
  geoC: false,
  accidentelle: false,
  psiAccidentelle: 'psi1',
  els: true,
  variablesFavorables: false,
};

/** Un terme d'une combinaison : action, coefficient et son explication. */
export interface Terme {
  action: string;
  coefficient: number;
  /** Composition du coefficient, par exemple « gamma_Q psi_0 = 1,5 × 0,7 ». */
  detail: string;
}

export interface Combinaison {
  famille: Famille;
  /** Numero dans la famille, a partir de 1. */
  numero: number;
  /** Expression de l'EN 1990 appliquee : 6.10, 6.10a, 6.10b, 6.11b... */
  expression: string;
  /** Action variable dominante, `null` s'il n'y en a pas. */
  dominante: string | null;
  termes: Terme[];
}

/** Au-dela, la saisie est presque surement une erreur (trop de groupes ou d'options). */
export const NOMBRE_MAXIMAL = 5000;

/** Facteur de tolerance pour reconnaitre deux combinaisons identiques. */
const PRECISION = 1e-9;

function fr(x: number): string {
  return String(Math.round(x * 1000) / 1000).replace('.', ',');
}

/**
 * Les assignations des actions variables : pour chaque groupe d'exclusion,
 * l'un de ses membres, ou aucun si les variables peuvent etre favorables.
 */
function assignationsVariables(variables: ActionVariable[], avecAbsence: boolean): ActionVariable[][] {
  const groupes = new Map<string, ActionVariable[]>();
  for (const v of variables) {
    const cle = v.groupe !== undefined && v.groupe.trim() !== '' ? `g:${v.groupe.trim()}` : `a:${v.id}`;
    const liste = groupes.get(cle) ?? [];
    liste.push(v);
    groupes.set(cle, liste);
  }
  let resultat: ActionVariable[][] = [[]];
  for (const membres of groupes.values()) {
    const choix: Array<ActionVariable | null> = avecAbsence ? [null, ...membres] : membres;
    const suivant: ActionVariable[][] = [];
    for (const partiel of resultat) {
      for (const c of choix) suivant.push(c === null ? partiel : [...partiel, c]);
      if (suivant.length > NOMBRE_MAXIMAL) throw new Error(trop());
    }
    resultat = suivant;
  }
  return resultat;
}

/** Les etats des permanentes : chaque action « peut etre favorable » au sup ou a l'inf. */
function etatsPermanentes(permanentes: ActionPermanente[]): Array<Set<string>> {
  const variables = permanentes.filter((p) => p.peutEtreFavorable);
  if (variables.length > 10) {
    throw new Error('Plus de 10 actions permanentes pouvant etre favorables : regrouper les actions permanentes.');
  }
  const etats: Array<Set<string>> = [];
  for (let masque = 0; masque < 1 << variables.length; masque++) {
    etats.push(new Set(variables.filter((_, i) => (masque >> i) & 1).map((p) => p.id)));
  }
  return etats;
}

function trop(): string {
  return (
    `Plus de ${NOMBRE_MAXIMAL} combinaisons : reduire le nombre d actions variables, ` +
    'les rassembler en groupes d exclusion, ou decocher « actions variables favorables ».'
  );
}

/**
 * Regle A1.2.1(3) : les charges d'exploitation des toits (categorie H) ne se
 * combinent ni avec la neige ni avec le vent. Une combinaison ou H est
 * presente avec un coefficient non nul perd la neige et le vent ; si c'est
 * la neige ou le vent qui domine, H disparait.
 */
function appliquerToits(termes: Terme[], variables: Map<string, ActionVariable>, dominante: string | null): Terme[] {
  const cat = (id: string) => variables.get(id)?.categorie;
  const estClimatique = (id: string) => {
    const c = cat(id);
    return c === 'neige' || c === 'neige-haute' || c === 'vent';
  };
  const hActif = termes.some((t) => cat(t.action) === 'H' && t.coefficient > 0);
  if (!hActif) return termes;
  const dominanteClimatique = dominante !== null && estClimatique(dominante);
  return termes.filter((t) => (dominanteClimatique ? cat(t.action) !== 'H' : !estClimatique(t.action)));
}

interface Contexte {
  profil: ProfilCombinaisons;
  permanentes: ActionPermanente[];
  variables: ActionVariable[];
  parId: Map<string, ActionVariable>;
  assignations: ActionVariable[][];
}

function psiDe(ctx: Contexte, v: ActionVariable, quel: 'psi0' | 'psi1' | 'psi2'): number {
  return ctx.profil.psi[v.categorie][quel].valeur;
}

/** Termes des permanentes pour un jeu de gamma et un etat (inf / sup). */
function termesPermanents(ctx: Contexte, jeu: JeuGamma, inf: Set<string>, xi: number | null): Terme[] {
  return ctx.permanentes.map((p) => {
    if (inf.has(p.id)) {
      return { action: p.id, coefficient: jeu.gammaGInf.valeur, detail: `gamma_G,inf = ${fr(jeu.gammaGInf.valeur)}` };
    }
    if (xi !== null) {
      return {
        action: p.id,
        coefficient: xi * jeu.gammaGSup.valeur,
        detail: `xi gamma_G,sup = ${fr(xi)} × ${fr(jeu.gammaGSup.valeur)}`,
      };
    }
    return { action: p.id, coefficient: jeu.gammaGSup.valeur, detail: `gamma_G,sup = ${fr(jeu.gammaGSup.valeur)}` };
  });
}

/**
 * Combinaisons fondamentales (6.10), (6.10a), (6.10b) pour un jeu de gamma.
 * `variante` : '6.10' ou '6.10a' ou '6.10b'.
 */
function fondamentales(ctx: Contexte, famille: Famille, jeu: JeuGamma, variante: '6.10' | '6.10a' | '6.10b'): Array<Omit<Combinaison, 'numero'>> {
  const gQ = jeu.gammaQ.valeur;
  const xi = variante === '6.10b' ? ctx.profil.xi.valeur : null;
  const sortie: Array<Omit<Combinaison, 'numero'>> = [];

  for (const inf of etatsPermanentes(ctx.permanentes)) {
    const perm = termesPermanents(ctx, jeu, inf, xi);
    for (const presentes of ctx.assignations) {
      // (6.10a) : toutes les variables a gamma_Q psi_0, aucune dominante.
      if (variante === '6.10a' || presentes.length === 0) {
        const termes = [
          ...perm,
          ...presentes.map((v) => ({
            action: v.id,
            coefficient: gQ * psiDe(ctx, v, 'psi0'),
            detail: `gamma_Q psi_0 = ${fr(gQ)} × ${fr(psiDe(ctx, v, 'psi0'))}`,
          })),
        ];
        sortie.push({ famille, expression: variante, dominante: null, termes: appliquerToits(termes, ctx.parId, null) });
        continue;
      }
      for (const dominante of presentes) {
        const termes = [
          ...perm,
          ...presentes.map((v) =>
            v.id === dominante.id
              ? { action: v.id, coefficient: gQ, detail: `gamma_Q = ${fr(gQ)} (dominante)` }
              : {
                  action: v.id,
                  coefficient: gQ * psiDe(ctx, v, 'psi0'),
                  detail: `gamma_Q psi_0 = ${fr(gQ)} × ${fr(psiDe(ctx, v, 'psi0'))}`,
                }
          ),
        ];
        sortie.push({ famille, expression: variante, dominante: dominante.id, termes: appliquerToits(termes, ctx.parId, dominante.id) });
      }
    }
  }
  return sortie;
}

/** Combinaisons accidentelles (6.11b), une par action accidentelle. */
function accidentelles(ctx: Contexte, accidents: ActionAccidentelle[], psiDominante: 'psi1' | 'psi2'): Array<Omit<Combinaison, 'numero'>> {
  const sortie: Array<Omit<Combinaison, 'numero'>> = [];
  const perm: Terme[] = ctx.permanentes.map((p) => ({ action: p.id, coefficient: 1, detail: 'G_k (1)' }));
  for (const a of accidents) {
    const ad: Terme = { action: a.id, coefficient: 1, detail: 'A_d (1)' };
    for (const presentes of ctx.assignations) {
      const dominantes: Array<ActionVariable | null> = presentes.length === 0 ? [null] : presentes;
      for (const dominante of dominantes) {
        const termes = [
          ...perm,
          ad,
          ...presentes.map((v) => {
            const quel = dominante !== null && v.id === dominante.id ? psiDominante : 'psi2';
            const nom = quel === 'psi1' ? 'psi_1' : 'psi_2';
            return { action: v.id, coefficient: psiDe(ctx, v, quel), detail: `${nom} = ${fr(psiDe(ctx, v, quel))}` };
          }),
        ];
        sortie.push({
          famille: 'ELU-ACC',
          expression: '6.11b',
          dominante: dominante?.id ?? null,
          termes: appliquerToits(termes, ctx.parId, dominante?.id ?? null),
        });
      }
    }
  }
  return sortie;
}

/** Combinaisons de service (6.14b), (6.15b), (6.16b). Permanentes a 1,0. */
function service(ctx: Contexte, famille: 'ELS-CAR' | 'ELS-FREQ' | 'ELS-QP'): Array<Omit<Combinaison, 'numero'>> {
  const perm: Terme[] = ctx.permanentes.map((p) => ({ action: p.id, coefficient: 1, detail: 'G_k (1)' }));
  const expression = famille === 'ELS-CAR' ? '6.14b' : famille === 'ELS-FREQ' ? '6.15b' : '6.16b';
  const sortie: Array<Omit<Combinaison, 'numero'>> = [];

  for (const presentes of ctx.assignations) {
    if (famille === 'ELS-QP' || presentes.length === 0) {
      const termes = [
        ...perm,
        ...presentes.map((v) => ({ action: v.id, coefficient: psiDe(ctx, v, 'psi2'), detail: `psi_2 = ${fr(psiDe(ctx, v, 'psi2'))}` })),
      ];
      sortie.push({ famille, expression, dominante: null, termes: appliquerToits(termes, ctx.parId, null) });
      continue;
    }
    for (const dominante of presentes) {
      const termes = [
        ...perm,
        ...presentes.map((v) => {
          if (v.id === dominante.id) {
            return famille === 'ELS-CAR'
              ? { action: v.id, coefficient: 1, detail: 'Q_k (1, dominante)' }
              : { action: v.id, coefficient: psiDe(ctx, v, 'psi1'), detail: `psi_1 = ${fr(psiDe(ctx, v, 'psi1'))} (dominante)` };
          }
          const quel = famille === 'ELS-CAR' ? 'psi0' : 'psi2';
          return { action: v.id, coefficient: psiDe(ctx, v, quel), detail: `${quel === 'psi0' ? 'psi_0' : 'psi_2'} = ${fr(psiDe(ctx, v, quel))}` };
        }),
      ];
      sortie.push({ famille, expression, dominante: dominante.id, termes: appliquerToits(termes, ctx.parId, dominante.id) });
    }
  }
  return sortie;
}

/**
 * Retire les doublons d'une famille : deux combinaisons dont TOUS les
 * coefficients coincident n'en font qu'une (cas des actions a psi nul, ou de
 * la regle des toits). La premiere rencontree est gardee.
 */
function sansDoublons(liste: Array<Omit<Combinaison, 'numero'>>): Array<Omit<Combinaison, 'numero'>> {
  const vues = new Set<string>();
  const sortie: Array<Omit<Combinaison, 'numero'>> = [];
  for (const c of liste) {
    const cle =
      c.famille +
      '|' +
      c.termes
        .filter((t) => Math.abs(t.coefficient) > PRECISION)
        .map((t) => `${t.action}=${Math.round(t.coefficient / PRECISION)}`)
        .sort()
        .join(',');
    if (vues.has(cle)) continue;
    vues.add(cle);
    sortie.push({ ...c, termes: c.termes.filter((t) => Math.abs(t.coefficient) > PRECISION) });
  }
  return sortie;
}

/** Controle la saisie : identifiants uniques, au moins une action. */
function verifierActions(actions: readonly Action[]): void {
  if (actions.length === 0) throw new Error('Aucune action saisie.');
  const ids = new Set<string>();
  for (const a of actions) {
    if (a.id.trim() === '') throw new Error('Une action n a pas d identifiant.');
    if (ids.has(a.id)) throw new Error(`Identifiant d action en double : ${a.id}.`);
    ids.add(a.id);
  }
}

/**
 * Toutes les combinaisons des familles retenues, numerotees dans chaque
 * famille.
 */
export function genererCombinaisons(actions: readonly Action[], options: Options, profil: ProfilCombinaisons): Combinaison[] {
  verifierProfil(profil);
  verifierActions(actions);

  const permanentes = actions.filter((a): a is ActionPermanente => a.nature === 'permanente');
  const variables = actions.filter((a): a is ActionVariable => a.nature === 'variable');
  const accidents = actions.filter((a): a is ActionAccidentelle => a.nature === 'accidentelle');

  const ctx: Contexte = {
    profil,
    permanentes,
    variables,
    parId: new Map(variables.map((v) => [v.id, v])),
    assignations: assignationsVariables(variables, options.variablesFavorables),
  };

  const brutes: Array<Omit<Combinaison, 'numero'>> = [];
  if (options.equ) brutes.push(...fondamentales(ctx, 'ELU-EQU', profil.jeuA, '6.10'));
  if (options.formule === '6.10') {
    brutes.push(...fondamentales(ctx, 'ELU-STR', profil.jeuB, '6.10'));
  } else {
    brutes.push(...fondamentales(ctx, 'ELU-STR', profil.jeuB, '6.10a'), ...fondamentales(ctx, 'ELU-STR', profil.jeuB, '6.10b'));
  }
  if (options.geoC) brutes.push(...fondamentales(ctx, 'ELU-GEO', profil.jeuC, '6.10'));
  if (options.accidentelle) {
    if (accidents.length === 0) throw new Error('Combinaisons accidentelles demandees, mais aucune action accidentelle saisie.');
    brutes.push(...accidentelles(ctx, accidents, options.psiAccidentelle));
  }
  if (options.els) brutes.push(...service(ctx, 'ELS-CAR'), ...service(ctx, 'ELS-FREQ'), ...service(ctx, 'ELS-QP'));

  if (brutes.length > NOMBRE_MAXIMAL) throw new Error(trop());

  const uniques = sansDoublons(brutes);
  const compteurs = new Map<Famille, number>();
  return uniques.map((c) => {
    const n = (compteurs.get(c.famille) ?? 0) + 1;
    compteurs.set(c.famille, n);
    return { ...c, numero: n };
  });
}

/**
 * Ecriture lisible d'une combinaison : « 1,35 G1 + 1,5 Q1 + 1,05 Q2 ».
 * `noms` traduit un identifiant d'action en son libelle court.
 */
export function formuleLisible(c: Combinaison, noms: (id: string) => string): string {
  return c.termes.map((t) => `${fr(t.coefficient)} ${noms(t.action)}`).join(' + ');
}
