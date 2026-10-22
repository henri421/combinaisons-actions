/**
 * Valeurs combinees des effets, quand l'utilisateur fournit l'effet de chaque
 * action (un effort, un moment, une reaction...).
 *
 * Superposition lineaire : E_d = somme des coefficients × E_k de chaque
 * action. Valable pour une analyse lineaire seulement ; c'est a l'ingenieur
 * de juger qu'elle s'applique.
 *
 * Unites : celles de la saisie, conservees telles quelles.
 */

import type { Combinaison, Famille } from './combinaisons';

/** Effets caracteristiques : pour chaque action, une valeur par effet (ou `null` : non saisi). */
export type Effets = Record<string, ReadonlyArray<number | null>>;

export interface ValeurCombinee {
  combinaison: Combinaison;
  /** Une valeur par effet ; `null` si un terme non nul n'a pas de valeur saisie. */
  valeurs: Array<number | null>;
}

/** Valeurs combinees de chaque combinaison, effet par effet. */
export function combinerEffets(combinaisons: readonly Combinaison[], effets: Effets, nombreEffets: number): ValeurCombinee[] {
  return combinaisons.map((c) => {
    const valeurs: Array<number | null> = [];
    for (let k = 0; k < nombreEffets; k++) {
      let somme: number | null = 0;
      for (const t of c.termes) {
        const v = effets[t.action]?.[k] ?? null;
        // Un terme sans valeur rend la somme INCONNUE : la compter pour zero
        // ferait passer une combinaison incomplete pour une combinaison juste.
        if (v === null) {
          somme = null;
          break;
        }
        somme += t.coefficient * v;
      }
      valeurs.push(somme);
    }
    return { combinaison: c, valeurs };
  });
}

export interface Extremum {
  valeur: number;
  famille: Famille;
  numero: number;
}

export interface Enveloppe {
  famille: Famille;
  /** Par effet : maximum et minimum, avec la combinaison qui les donne ; `null` si aucune valeur connue. */
  max: Array<Extremum | null>;
  min: Array<Extremum | null>;
}

/** Enveloppe max / min par famille et par effet. */
export function enveloppes(valeurs: readonly ValeurCombinee[], nombreEffets: number): Enveloppe[] {
  const parFamille = new Map<Famille, Enveloppe>();
  for (const v of valeurs) {
    const f = v.combinaison.famille;
    let env = parFamille.get(f);
    if (env === undefined) {
      env = { famille: f, max: Array(nombreEffets).fill(null), min: Array(nombreEffets).fill(null) };
      parFamille.set(f, env);
    }
    for (let k = 0; k < nombreEffets; k++) {
      const x = v.valeurs[k];
      if (x === null || x === undefined) continue;
      const point = { valeur: x, famille: f, numero: v.combinaison.numero };
      if (env.max[k] === null || x > (env.max[k] as Extremum).valeur) env.max[k] = point;
      if (env.min[k] === null || x < (env.min[k] as Extremum).valeur) env.min[k] = point;
    }
  }
  return [...parFamille.values()];
}
