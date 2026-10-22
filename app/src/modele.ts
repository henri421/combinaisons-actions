/**
 * Le modele saisi : actions, effets, options. PUR, sans DOM.
 *
 * Les valeurs restent en CHAINES tant qu'elles sont saisies ; `lireModele`
 * est le seul endroit ou elles deviennent des nombres, et le seul ou une
 * saisie invalide est refusee, en nommant le champ.
 */

import { lireNombre } from 'aedificium-ui';
import {
  CATEGORIES,
  OPTIONS_PAR_DEFAUT,
  type Action,
  type Categorie,
  type Effets,
  type Options,
} from '../../src/index';

export type Nature = 'permanente' | 'variable' | 'accidentelle';

/** Une ligne de l'editeur d'actions, telle que saisie. */
export interface LigneAction {
  id: string;
  nom: string;
  nature: Nature;
  categorie: Categorie;
  groupe: string;
  peutEtreFavorable: boolean;
  /** Une chaine par effet ; vide = non saisi. */
  effets: string[];
}

export interface Saisie {
  actions: LigneAction[];
  /** Noms des effets, separes par des points-virgules (« N ; M »). Vide : aucun effet. */
  nomsEffets: string;
  options: Options;
}

export function saisieParDefaut(): Saisie {
  return {
    actions: [
      { id: 'G', nom: 'Poids propre et charges permanentes', nature: 'permanente', categorie: 'A', groupe: '', peutEtreFavorable: false, effets: ['', ''] },
      { id: 'Q', nom: 'Exploitation, bureaux', nature: 'variable', categorie: 'B', groupe: '', peutEtreFavorable: false, effets: ['', ''] },
      { id: 'S', nom: 'Neige', nature: 'variable', categorie: 'neige', groupe: '', peutEtreFavorable: false, effets: ['', ''] },
      { id: 'W', nom: 'Vent', nature: 'variable', categorie: 'vent', groupe: '', peutEtreFavorable: false, effets: ['', ''] },
    ],
    nomsEffets: '',
    options: { ...OPTIONS_PAR_DEFAUT },
  };
}

/** Noms des effets, nettoyes. */
export function nomsDesEffets(saisie: Saisie): string[] {
  return saisie.nomsEffets
    .split(';')
    .map((n) => n.trim())
    .filter((n) => n !== '');
}

export type Lecture =
  | { ok: true; actions: Action[]; effets: Effets; nomsEffets: string[]; options: Options }
  | { ok: false; message: string };

/** Convertit la saisie en donnees du noyau, ou rend le motif du refus. */
export function lireModele(saisie: Saisie): Lecture {
  const noms = nomsDesEffets(saisie);
  const actions: Action[] = [];
  const effets: Effets = {};
  try {
    saisie.actions.forEach((l, i) => {
      const id = l.id.trim();
      if (id === '') throw new Error(`Action ${i + 1} : identifiant vide.`);
      const nom = l.nom.trim() === '' ? id : l.nom.trim();
      if (l.nature === 'permanente') actions.push({ id, nom, nature: 'permanente', peutEtreFavorable: l.peutEtreFavorable });
      else if (l.nature === 'accidentelle') actions.push({ id, nom, nature: 'accidentelle' });
      else {
        if (!CATEGORIES.includes(l.categorie)) throw new Error(`Action ${id} : categorie inconnue.`);
        actions.push({ id, nom, nature: 'variable', categorie: l.categorie, ...(l.groupe.trim() !== '' ? { groupe: l.groupe.trim() } : {}) });
      }
      effets[id] = noms.map((n, k) => {
        const brut = (l.effets[k] ?? '').trim();
        if (brut === '') return null;
        const v = lireNombre(brut);
        if (v === null || !Number.isFinite(v)) throw new Error(`Action ${id}, effet ${n} : nombre attendu, recu « ${brut} ».`);
        return v;
      });
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
  return { ok: true, actions, effets, nomsEffets: noms, options: saisie.options };
}

/** Prochain identifiant libre pour une nature : G1, G2... Q1... A1... */
export function identifiantLibre(saisie: Saisie, nature: Nature): string {
  const prefixe = nature === 'permanente' ? 'G' : nature === 'variable' ? 'Q' : 'A';
  const pris = new Set(saisie.actions.map((a) => a.id));
  for (let n = 1; ; n++) if (!pris.has(`${prefixe}${n}`)) return `${prefixe}${n}`;
}

// --- Persistance ----------------------------------------------------------------

const FORMAT = 'combinaisons-actions/1';

/** Le document enregistre : la saisie, avec son format. */
export function serialiser(saisie: Saisie): string {
  return JSON.stringify({ format: FORMAT, ...saisie }, null, 2);
}

/** Relit un document enregistre ; leve si le format n'est pas reconnu. */
export function relire(texte: string): Saisie {
  const brut = JSON.parse(texte) as Record<string, unknown>;
  if (brut.format !== FORMAT) throw new Error(`Fichier de format ${JSON.stringify(brut.format)} : attendu ${FORMAT}.`);
  const defaut = saisieParDefaut();
  const actions = Array.isArray(brut.actions) ? (brut.actions as LigneAction[]) : [];
  return {
    actions: actions.map((a) => ({
      id: String(a.id ?? ''),
      nom: String(a.nom ?? ''),
      nature: a.nature === 'permanente' || a.nature === 'accidentelle' ? a.nature : 'variable',
      categorie: CATEGORIES.includes(a.categorie) ? a.categorie : 'A',
      groupe: String(a.groupe ?? ''),
      peutEtreFavorable: a.peutEtreFavorable === true,
      effets: Array.isArray(a.effets) ? a.effets.map(String) : [],
    })),
    nomsEffets: typeof brut.nomsEffets === 'string' ? brut.nomsEffets : '',
    options: { ...defaut.options, ...(typeof brut.options === 'object' && brut.options !== null ? (brut.options as Partial<Options>) : {}) },
  };
}
