/**
 * Contenu de la note de calcul commune (`noteDeCalculHtml` d'aedificium-ui).
 *
 * Module PUR. Les tableaux reprennent, en cellules, ceux de l'ecran (`vue`) :
 * memes colonnes, memes valeurs, meme ordre. Aucune verification ici : la note
 * n'a pas de conclusions.
 */

import { nombreAffiche, type ElementNote, type NoteDeCalcul } from 'aedificium-ui';
import { LIBELLES_CATEGORIES, LIBELLES_FAMILLES, formuleLisible, type Action, type Famille, type Options, type ProfilCombinaisons } from '../../src/index';
import { famillesPresentes, type Resultat } from './vue';

export const HYPOTHESES = [
  'EN 1990:2002, annexe A1 (bâtiments) : expressions (6.10), (6.10a), (6.10b), (6.11b), (6.14b), (6.15b), (6.16b).',
  "Les charges d'exploitation des toits (catégorie H) ne sont combinées ni avec la neige ni avec le vent (A1.2.1(3)).",
  "Deux actions d'un même groupe d'exclusion ne sont jamais simultanées.",
  'Valeurs combinées par superposition linéaire des effets saisis : valable pour une analyse linéaire seulement.',
  'Ni combinaisons sismiques (6.12b), ni actions de précontrainte, ni ponts (annexe A2).',
];

export const ELEMENT_PAR_DEFAUT = "Combinaisons d'actions";

/** Les options, en phrases. */
export function optionsEnTexte(o: Options): string[] {
  return [
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
  ];
}

const nombre = (x: number | null): string => (x === null ? '—' : nombreAffiche(x, 3));
const coef = (x: number): string => nombreAffiche(x, 2);

/** Lignes du tableau des actions : celles de `tableauActions`. */
export function lignesActions(actions: readonly Action[], profil: ProfilCombinaisons): string[][] {
  return actions.map((a) => {
    const psi = a.nature === 'variable' ? profil.psi[a.categorie] : null;
    const nature =
      a.nature === 'permanente'
        ? `permanente${a.peutEtreFavorable ? ', peut être favorable' : ''}`
        : a.nature === 'accidentelle'
          ? 'accidentelle'
          : LIBELLES_CATEGORIES[a.categorie];
    const groupe = a.nature === 'variable' && a.groupe !== undefined ? a.groupe : '';
    return [a.id, a.nom, nature, groupe, ...(psi === null ? ['', '', ''] : [coef(psi.psi0.valeur), coef(psi.psi1.valeur), coef(psi.psi2.valeur)])];
  });
}

/** Lignes des coefficients partiels : celles de `tableauGamma`. */
export function lignesGamma(profil: ProfilCombinaisons): string[][] {
  const ligne = (nom: string, j: ProfilCombinaisons['jeuA']): string[] => [nom, coef(j.gammaGSup.valeur), coef(j.gammaGInf.valeur), coef(j.gammaQ.valeur), j.gammaQ.source];
  return [ligne('A, EQU', profil.jeuA), ligne('B, STR/GEO', profil.jeuB), ligne('C, GEO', profil.jeuC), ['xi (6.10b)', coef(profil.xi.valeur), '', '', profil.xi.source]];
}

/** Tableau d'une famille : celui de `tableauFamille`. */
export function tableauFamilleNote(f: Famille, r: Resultat): ElementNote {
  const liste = r.valeurs.filter((v) => v.combinaison.famille === f);
  return {
    type: 'tableau',
    titre: `${LIBELLES_FAMILLES[f]} — ${liste.length} combinaison${liste.length > 1 ? 's' : ''}`,
    entetes: ['N°', 'Expr.', 'Dominante', 'Combinaison', ...r.nomsEffets],
    lignes: liste.map((v) => [
      String(v.combinaison.numero),
      v.combinaison.expression,
      v.combinaison.dominante ?? '—',
      formuleLisible(v.combinaison, (id) => id),
      ...v.valeurs.map(nombre),
    ]),
  };
}

/** Enveloppes : celles de `tableauEnveloppes` ; `null` sans effet saisi. */
export function tableauEnveloppesNote(r: Resultat): ElementNote | null {
  if (r.nomsEffets.length === 0) return null;
  const cellule = (e: { valeur: number; numero: number } | null): string => (e === null ? '—' : `${nombre(e.valeur)} (n° ${e.numero})`);
  return {
    type: 'tableau',
    titre: 'Enveloppes des effets',
    entetes: ['Famille', 'Extremum', ...r.nomsEffets],
    lignes: r.enveloppes.flatMap((env) => [
      [LIBELLES_FAMILLES[env.famille], 'max', ...env.max.map(cellule)],
      ['', 'min', ...env.min.map(cellule)],
    ]),
  };
}

/** Effets saisis, une ligne par action ; `null` sans effet ou sans effets connus. */
export function tableauEffets(r: Resultat): ElementNote | null {
  if (r.nomsEffets.length === 0 || r.effets === undefined) return null;
  const effets = r.effets;
  return {
    type: 'tableau',
    titre: 'Effets caractéristiques saisis',
    entetes: ['Action', ...r.nomsEffets],
    lignes: r.actions.map((a) => [a.id, ...r.nomsEffets.map((_, i) => nombre(effets[a.id]?.[i] ?? null))]),
  };
}

/** Note du calcul courant. */
export function noteDuCalcul(
  profil: ProfilCombinaisons,
  r: Resultat,
  options: Options,
  cartouche: { projet: string; element: string; date: string }
): NoteDeCalcul {
  const effets = tableauEffets(r);
  const enveloppe = tableauEnveloppesNote(r);
  return {
    cartouche: {
      projet: cartouche.projet,
      element: cartouche.element.trim() === '' ? ELEMENT_PAR_DEFAUT : cartouche.element,
      date: cartouche.date,
      norme: 'EN 1990:2002, annexe A1',
      outil: 'combinaisons-actions',
    },
    sections: {
      hypotheses: [
        { type: 'texte', texte: `Profil normatif : ${profil.nom}, données consultées le ${profil.date}.` },
        { type: 'tableau', titre: 'Coefficients partiels', entetes: ['Jeu', 'gamma_G,sup', 'gamma_G,inf', 'gamma_Q', 'Source'], lignes: lignesGamma(profil) },
        { type: 'liste', items: optionsEnTexte(options) },
        { type: 'liste', items: HYPOTHESES },
      ],
      charges: [
        { type: 'tableau', titre: 'Actions', entetes: ['Id', 'Action', 'Nature, catégorie', 'Groupe', 'psi_0', 'psi_1', 'psi_2'], lignes: lignesActions(r.actions, profil) },
        ...(effets === null ? [] : [effets]),
      ],
      combinaisons: famillesPresentes(r.valeurs).map((f) => tableauFamilleNote(f, r)),
      calculs: enveloppe === null ? [] : [enveloppe],
    },
    verifications: [],
  };
}
