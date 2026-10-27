/**
 * Les sorties tabulaires : CSV et classeur Excel. PUR, sans DOM ; le
 * telechargement et la note de calcul vivent ailleurs (`main.ts`).
 */

import { csv, notationTexte, nombreAffiche } from 'aedificium-ui';
import { LIBELLES_FAMILLES, type ProfilCombinaisons } from '../../src/index';
import { classeurXlsx, type Cellule, type Feuille } from './xlsx';
import { famillesPresentes, lignesDuTableau, type Resultat } from './vue';

/** Cellule en texte de tableur francais : virgule decimale, notation brute. */
function texte(c: Cellule): string {
  if (c === null) return '';
  return typeof c === 'number' ? nombreAffiche(c, 3) : notationTexte(c);
}

/** Texte d'une cellule pour le classeur : la notation source y devient du texte brut. */
function enTexte(c: Cellule): Cellule {
  return typeof c === 'string' ? notationTexte(c) : c;
}

/** CSV de toutes les combinaisons, une ligne par combinaison. */
export function combinaisonsEnCsv(r: Resultat): string {
  return csv(lignesDuTableau(r).map((l) => l.map(texte)));
}

/** Classeur : un onglet par famille, puis les actions et l'enveloppe. */
export function combinaisonsEnXlsx(r: Resultat, profil: ProfilCombinaisons): Uint8Array {
  const feuilles: Feuille[] = famillesPresentes(r.valeurs).map((f) => ({
    nom: LIBELLES_FAMILLES[f].split(' (')[0],
    lignes: lignesDuTableau(r, [f]).map((l) => l.map(enTexte)),
  }));

  feuilles.push({
    nom: 'Actions',
    lignes: [
      ['Id', 'Action', 'Nature', 'Catégorie', 'Groupe', 'psi_0', 'psi_1', 'psi_2'].map(enTexte) as Cellule[],
      ...r.actions.map((a): Cellule[] => {
        const psi = a.nature === 'variable' ? profil.psi[a.categorie] : null;
        return [
          a.id,
          a.nom,
          a.nature,
          a.nature === 'variable' ? a.categorie : '',
          a.nature === 'variable' ? (a.groupe ?? '') : '',
          psi?.psi0.valeur ?? null,
          psi?.psi1.valeur ?? null,
          psi?.psi2.valeur ?? null,
        ].map(enTexte);
      }),
    ],
  });

  if (r.nomsEffets.length > 0) {
    feuilles.push({
      nom: 'Enveloppes',
      lignes: [
        ['Famille', 'Extremum', ...r.nomsEffets.flatMap((n) => [n, `${n} : n°`])].map(enTexte) as Cellule[],
        ...r.enveloppes.flatMap((env): Cellule[][] => [
          [LIBELLES_FAMILLES[env.famille], 'max', ...env.max.flatMap((e) => (e === null ? [null, null] : [e.valeur, e.numero]))].map(enTexte),
          [LIBELLES_FAMILLES[env.famille], 'min', ...env.min.flatMap((e) => (e === null ? [null, null] : [e.valeur, e.numero]))].map(enTexte),
        ]),
      ],
    });
  }

  return classeurXlsx(feuilles);
}

