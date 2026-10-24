/**
 * Les sorties : CSV, classeur Excel, note de calcul. PUR, sans DOM ; le
 * telechargement vit dans `main.ts`.
 */

import { JETONS, csv, notationHtml, notationTexte, nombreAffiche } from 'aedificium-ui';
import { LIBELLES_FAMILLES, type Options, type ProfilCombinaisons } from '../../src/index';
import { classeurXlsx, type Cellule, type Feuille } from './xlsx';
import { famillesPresentes, lignesDuTableau, rendreResultats, tableauActions, tableauEnveloppes, tableauGamma, type Resultat } from './vue';

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

const STYLE_NOTE = `${JETONS}
  body { margin: 0; padding: 24px 28px; background: var(--surface); color: var(--texte); font: 13px/1.5 var(--sans); }
  h1 { font-size: 1.15rem; font-weight: normal; margin: 0 0 .2rem; }
  h2 { font-size: .95rem; font-weight: 600; margin: 1.5rem 0 .5rem; border-bottom: 1px solid var(--bordure); padding-bottom: .25rem; }
  h3 { font-size: .82rem; font-weight: 600; margin: 1rem 0 .35rem; }
  .date { color: var(--texte-faible); font-size: .8rem; margin: 0 0 1rem; }
  table { border-collapse: collapse; width: 100%; margin: .3rem 0 .6rem; font-size: .78rem; }
  td, th { border-bottom: 1px solid var(--bordure-douce); padding: .2rem .4rem; text-align: left; vertical-align: top; }
  th { background: var(--surface-appui); font-weight: 600; }
  td.valeur { font-family: var(--mono); text-align: right; white-space: nowrap; }
  .clause, .extremum, .compte { color: var(--texte-faible); font-size: .75rem; font-weight: normal; }
  ul { margin: .3rem 0 .6rem; padding-left: 1.1rem; color: var(--texte-doux); }
  @media print { body { padding: 0; } h2 { page-break-after: avoid; } .famille { page-break-inside: avoid; } }
`;

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

export const HYPOTHESES = [
  'EN 1990:2002, annexe A1 (bâtiments) : expressions (6.10), (6.10a), (6.10b), (6.11b), (6.14b), (6.15b), (6.16b).',
  "Les charges d'exploitation des toits (catégorie H) ne sont combinées ni avec la neige ni avec le vent (A1.2.1(3)).",
  "Deux actions d'un même groupe d'exclusion ne sont jamais simultanées.",
  'Valeurs combinées par superposition linéaire des effets saisis : valable pour une analyse linéaire seulement.',
  'Ni combinaisons sismiques (6.12b), ni actions de précontrainte, ni ponts (annexe A2).',
];

/** La note de calcul : les memes tableaux que l'ecran, dans le meme ordre. */
export function noteDeCalculHtml(r: Resultat, profil: ProfilCombinaisons, options: Options, titre: string, date: string): string {
  const enveloppe = tableauEnveloppes(r);
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" />
<title>Note de calcul — ${notationHtml(titre)}</title>
<style>${STYLE_NOTE}</style></head>
<body>
<h1>Note de calcul — combinaisons d'actions (EN 1990)</h1>
<p class="date">${notationHtml(titre)} · ${notationHtml(date)} · profil : ${notationHtml(profil.nom)} (${notationHtml(profil.date)})</p>
<h2>Actions</h2>${tableauActions(r.actions, profil)}
<h2>Coefficients partiels</h2>${tableauGamma(profil)}
<h2>Options</h2><ul>${optionsEnTexte(options).map((o) => `<li>${notationHtml(o)}</li>`).join('')}</ul>
<h2>Combinaisons</h2>${rendreResultats(r)}
${enveloppe === '' ? '' : `<h2>Enveloppes des effets</h2>${enveloppe}`}
<h2>Hypothèses et limites</h2><ul>${HYPOTHESES.map((h) => `<li>${notationHtml(h)}</li>`).join('')}</ul>
</body></html>`;
}
