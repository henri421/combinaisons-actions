/**
 * Lecture du document d'actions exporte par charges-climatiques
 * (format `charges-climatiques/1`).
 *
 * Chaque cas de neige et chaque cas de vent devient une action variable. Les
 * cas de vent forment un groupe d'exclusion (un seul a la fois), les cas de
 * neige un autre : deux directions de vent ne soufflent pas ensemble.
 *
 * Seuls les NOMS des cas sont repris : les pressions du document sont des
 * charges surfaciques, pas les effets que combine ce module.
 */

import type { ActionVariable } from './combinaisons';

export interface ImportClimatique {
  actions: ActionVariable[];
  /** Ce qui n'a pas ete repris, avec le motif. */
  ignores: string[];
}

const FORMAT = 'charges-climatiques/1';

function objet(v: unknown, chemin: string): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`Import : ${chemin} attendu objet.`);
  return v as Record<string, unknown>;
}

function cas(bloc: Record<string, unknown>, chemin: string): Array<Record<string, unknown>> {
  if (!Array.isArray(bloc.cas)) throw new Error(`Import : ${chemin}.cas attendu tableau.`);
  return bloc.cas.map((c, i) => objet(c, `${chemin}.cas[${i}]`));
}

/**
 * Actions variables tirees du document. `categorieNeige` : la categorie du
 * tableau A1.1, qui depend de l'altitude du site (absente du document).
 */
export function actionsClimatiques(texte: string, categorieNeige: 'neige' | 'neige-haute'): ImportClimatique {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new Error('Import : le fichier n est pas un JSON lisible.');
  }
  const doc = objet(brut, 'document');
  if (doc.format !== FORMAT) {
    throw new Error(`Import : format ${JSON.stringify(doc.format)} inconnu (attendu ${FORMAT}).`);
  }

  const actions: ActionVariable[] = [];
  const ignores: string[] = [];

  const neige = objet(doc.neige, 'neige');
  if (typeof neige.nonCalcule === 'string') {
    ignores.push(`Neige non calculee : ${neige.nonCalcule}`);
  } else {
    cas(neige, 'neige').forEach((c, i) => {
      const nom = typeof c.nom === 'string' ? c.nom : `cas ${i + 1}`;
      actions.push({ id: `S${i + 1}`, nom: `Neige — ${nom}`, nature: 'variable', categorie: categorieNeige, groupe: 'neige' });
    });
  }

  const vent = objet(doc.vent, 'vent');
  if (typeof vent.nonCalcule === 'string') {
    ignores.push(`Vent non calcule : ${vent.nonCalcule}`);
  } else {
    cas(vent, 'vent').forEach((c, i) => {
      const nom = typeof c.libelle === 'string' ? c.libelle : `cas ${i + 1}`;
      actions.push({ id: `W${i + 1}`, nom: `Vent — ${nom}`, nature: 'variable', categorie: 'vent', groupe: 'vent' });
    });
  }

  return { actions, ignores };
}
