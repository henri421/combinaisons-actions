/**
 * Contenu de la note de calcul commune (`noteDeCalculHtml` d'aedificium-ui).
 *
 * Module PUR. Les tableaux reprennent, en cellules, ceux de l'ecran (`vue`) :
 * memes colonnes, memes valeurs, meme ordre. Aucune verification ici : la note
 * n'a pas de conclusions.
 */

import { nombreAffiche, type ElementNote, type NoteDeCalcul } from 'aedificium-ui';
import type { Action, Famille, Options, ProfilCombinaisons } from '../../src/index';
import { phrase, textes } from './textes';
import { famillesPresentes, formule, natureDe, type Resultat } from './vue';

/** Hypotheses de la note, en francais (reference des tests). La note lit `textes()`. */
export const HYPOTHESES = textes().note.hypotheses;

/** Les options, en phrases. */
export function optionsEnTexte(o: Options): string[] {
  return textes().options(o);
}

const nombre = (x: number | null): string => (x === null ? '—' : nombreAffiche(x, 3));
const coef = (x: number): string => nombreAffiche(x, 2);

/** Lignes du tableau des actions : celles de `tableauActions`. */
export function lignesActions(actions: readonly Action[], profil: ProfilCombinaisons): string[][] {
  return actions.map((a) => {
    const psi = a.nature === 'variable' ? profil.psi[a.categorie] : null;
    const nature = natureDe(a);
    const groupe = a.nature === 'variable' && a.groupe !== undefined ? a.groupe : '';
    return [a.id, a.nom, nature, groupe, ...(psi === null ? ['', '', ''] : [coef(psi.psi0.valeur), coef(psi.psi1.valeur), coef(psi.psi2.valeur)])];
  });
}

/** Lignes des coefficients partiels : celles de `tableauGamma`. */
export function lignesGamma(profil: ProfilCombinaisons): string[][] {
  const ligne = (nom: string, j: ProfilCombinaisons['jeuA']): string[] => [nom, coef(j.gammaGSup.valeur), coef(j.gammaGInf.valeur), coef(j.gammaQ.valeur), phrase(j.gammaQ.source)];
  return [ligne('A, EQU', profil.jeuA), ligne('B, STR/GEO', profil.jeuB), ligne('C, GEO', profil.jeuC), ['xi (6.10b)', coef(profil.xi.valeur), '', '', phrase(profil.xi.source)]];
}

/** Tableau d'une famille : celui de `tableauFamille`. */
export function tableauFamilleNote(f: Famille, r: Resultat): ElementNote {
  const t = textes();
  const liste = r.valeurs.filter((v) => v.combinaison.famille === f);
  return {
    type: 'tableau',
    titre: `${t.familles[f]} — ${t.compte(liste.length)}`,
    entetes: [t.entetes.numero, t.entetes.expression, t.entetes.dominante, t.entetes.combinaison, ...r.nomsEffets],
    lignes: liste.map((v) => [
      String(v.combinaison.numero),
      v.combinaison.expression,
      v.combinaison.dominante ?? '—',
      formule(v.combinaison),
      ...v.valeurs.map(nombre),
    ]),
  };
}

/** Enveloppes : celles de `tableauEnveloppes` ; `null` sans effet saisi. */
export function tableauEnveloppesNote(r: Resultat): ElementNote | null {
  if (r.nomsEffets.length === 0) return null;
  const t = textes();
  const cellule = (e: { valeur: number; numero: number } | null): string => (e === null ? '—' : `${nombre(e.valeur)} (${t.numero(e.numero)})`);
  return {
    type: 'tableau',
    titre: t.note.enveloppes,
    entetes: [t.entetes.famille, t.entetes.extremum, ...r.nomsEffets],
    lignes: r.enveloppes.flatMap((env) => [
      [t.familles[env.famille], 'max', ...env.max.map(cellule)],
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
    titre: textes().note.effets,
    entetes: [textes().entetes.action, ...r.nomsEffets],
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
  const t = textes();
  const e = t.entetes;
  const effets = tableauEffets(r);
  const enveloppe = tableauEnveloppesNote(r);
  return {
    cartouche: {
      projet: cartouche.projet,
      element: cartouche.element.trim() === '' ? t.note.element : cartouche.element,
      date: cartouche.date,
      norme: t.note.norme,
      outil: 'combinaisons-actions',
    },
    sections: {
      hypotheses: [
        { type: 'texte', texte: t.note.profil(phrase(profil.nom), profil.date) },
        { type: 'tableau', titre: t.note.coefficients, entetes: [e.jeu, 'gamma_G,sup', 'gamma_G,inf', 'gamma_Q', e.source], lignes: lignesGamma(profil) },
        { type: 'liste', items: optionsEnTexte(options) },
        { type: 'liste', items: t.note.hypotheses },
      ],
      charges: [
        { type: 'tableau', titre: t.note.actions, entetes: [e.id, e.action, e.natureCategorie, e.groupe, 'psi_0', 'psi_1', 'psi_2'], lignes: lignesActions(r.actions, profil) },
        ...(effets === null ? [] : [effets]),
      ],
      combinaisons: famillesPresentes(r.valeurs).map((f) => tableauFamilleNote(f, r)),
      calculs: enveloppe === null ? [] : [enveloppe],
    },
    verifications: [],
  };
}
