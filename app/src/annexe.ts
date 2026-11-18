/**
 * Annexe nationale (lot E, audit R4) : profil de calcul selon l'annexe choisie et
 * les coefficients saisis. Module PUR, sans DOM (le HTML des champs est une chaine).
 *
 * Le noyau ne connait aucune annexe : le profil luxembourgeois se construit ici, a
 * partir du profil recommande et de `valeurLu` (table commune `AN_LU` d'aedificium-ui).
 * Chaque coefficient est prerempli par l'annexe et reste modifiable ; une valeur
 * changee est marquee « valeur imposée par l’utilisateur » dans sa source.
 */

import { echapper, lireNombre, nombreAffiche, notationHtml, valeurLu, type AnnexeNationale } from 'aedificium-ui';
import { CATEGORIES, en1990Recommande, type Categorie, type ProfilCombinaisons, type ValeurSourcee } from '../../src/index';
import { sourceAffichee, textes } from './textes';

/** Partie de l'Eurocode du profil, telle que la bibliotheque la nomme. */
export const PARTIE_EUROCODE = 'EN 1990';

type Jeu = 'A' | 'B' | 'C';
const JEUX: readonly Jeu[] = ['A', 'B', 'C'];
const NOM_JEU: Record<Jeu, string> = { A: 'A, EQU', B: 'B, STR/GEO', C: 'C, GEO' };
const CHAMP_JEU = { A: 'jeuA', B: 'jeuB', C: 'jeuC' } as const;
const CHAMP_GAMMA = { gSup: 'gammaGSup', gInf: 'gammaGInf', gQ: 'gammaQ' } as const;
const SYMBOLE_GAMMA: Record<keyof typeof CHAMP_GAMMA, string> = { gSup: 'gamma_G,sup', gInf: 'gamma_G,inf', gQ: 'gamma_Q' };
const SYMBOLE_PSI: Record<'psi0' | 'psi1' | 'psi2', string> = { psi0: 'psi_0', psi1: 'psi_1', psi2: 'psi_2' };

/**
 * Cles des coefficients, dans l'ordre d'affichage : `psi0:A`… `psi2:H`,
 * `gSup:A`, `gInf:A`, `gQ:A`… (jeux A, B, C), puis `xi`.
 */
export const CLES_COEFFICIENTS: readonly string[] = [
  ...CATEGORIES.flatMap((c) => [`psi0:${c}`, `psi1:${c}`, `psi2:${c}`]),
  ...JEUX.flatMap((j) => [`gSup:${j}`, `gInf:${j}`, `gQ:${j}`]),
  'xi',
];

/** La valeur sourcee designee par une cle, dans le profil `p` (reference modifiable). */
function reperer(p: ProfilCombinaisons, cle: string): ValeurSourcee {
  if (cle === 'xi') return p.xi;
  const [code, lettre] = cle.split(':') as [string, string];
  if (code.startsWith('psi')) return p.psi[lettre as Categorie][code as 'psi0' | 'psi1' | 'psi2'];
  const jeu = p[CHAMP_JEU[lettre as Jeu]];
  return jeu[CHAMP_GAMMA[code as keyof typeof CHAMP_GAMMA]];
}

/** Symbole d'un coefficient, tel qu'il s'affiche. */
export function symboleDe(cle: string): string {
  if (cle === 'xi') return 'xi';
  const [code] = cle.split(':') as [string];
  return code.startsWith('psi') ? SYMBOLE_PSI[code as 'psi0' | 'psi1' | 'psi2'] : SYMBOLE_GAMMA[code as keyof typeof CHAMP_GAMMA];
}

/** Libelle d'un coefficient (categorie, jeu ou xi), dans la langue courante. */
export function libelleDe(cle: string): string {
  const t = textes();
  if (cle === 'xi') return t.annexe.xi;
  const [code, lettre] = cle.split(':') as [string, string];
  return code.startsWith('psi') ? t.categories[lettre as Categorie] : t.annexe.jeu(NOM_JEU[lettre as Jeu]);
}

/** La clause d'une source recommandee : ce qui suit « valeur recommandée, ». */
function clauseDe(source: string): string {
  return source.replace(/^EN 1990:2002, valeur recommandée, /, '');
}

/** Profil luxembourgeois : `valeurLu` sur CHAQUE valeur sourcee du profil recommande. */
export function profilLu(): ProfilCombinaisons {
  const p = en1990Recommande();
  for (const cle of CLES_COEFFICIENTS) {
    const r = reperer(p, cle);
    const lu = valeurLu(PARTIE_EUROCODE, cle, r, clauseDe(r.source));
    r.valeur = lu.valeur;
    r.source = lu.source;
  }
  p.nom = 'Luxembourg, ILNAS-EN 1990/AN-LU:2020 (valeurs présumées, à vérifier)';
  p.date = '2026-11-18';
  return p;
}

export function profilDeLAnnexe(a: AnnexeNationale): ProfilCombinaisons {
  return a === 'lu' ? profilLu() : en1990Recommande();
}

/** Valeurs de chaque coefficient d'une annexe, en chaines, pour preremplir les champs. */
export function coefficientsEnChaines(a: AnnexeNationale): Record<string, string> {
  const p = profilDeLAnnexe(a);
  return Object.fromEntries(CLES_COEFFICIENTS.map((cle) => [cle, nombreAffiche(reperer(p, cle).valeur, 3)]));
}

/**
 * Profil de calcul : celui de l'annexe, chaque valeur saisie differente marquee
 * « valeur imposée par l’utilisateur ». Leve, en nommant le coefficient, si une
 * valeur saisie n'est pas un nombre.
 */
export function profilDeCalcul(a: AnnexeNationale, saisis: Record<string, string>): ProfilCombinaisons {
  const base = profilDeLAnnexe(a);
  const p = profilDeLAnnexe(a);
  for (const cle of CLES_COEFFICIENTS) {
    const brut = saisis[cle] ?? '';
    const x = lireNombre(brut);
    if (x === null || !Number.isFinite(x)) throw new Error(textes().annexe.attendu(libelleDe(cle), brut));
    const b = reperer(base, cle);
    if (x !== b.valeur) {
      const v = reperer(p, cle);
      v.valeur = x;
      v.source = `valeur imposée par l’utilisateur (${b.source})`;
    }
  }
  return p;
}

/** Les coefficients d'un profil, dans l'ordre fixe : pour la note et les tableaux. */
export function coefficientsDuProfil(p: ProfilCombinaisons): { cle: string; symbole: string; libelle: string; valeur: number; source: string }[] {
  return CLES_COEFFICIENTS.map((cle) => {
    const r = reperer(p, cle);
    return { cle, symbole: symboleDe(cle), libelle: libelleDe(cle), valeur: r.valeur, source: r.source };
  });
}

/** Champs des coefficients (`data-coef`), groupes en deux tableaux : psi, puis jeux et xi. */
export function champsCoefficientsHtml(): string {
  const t = textes();
  const recommande = en1990Recommande();
  const clauseDeCle = (cle: string): string => sourceAffichee(clauseDe(reperer(recommande, cle).source));
  const champ = (cle: string): string =>
    `<input type="text" inputmode="decimal" data-coef="${cle}" aria-label="${echapper(`${symboleDe(cle)}, ${libelleDe(cle)}`)}" />`;
  const entetes = (premiere: string, noms: string[]): string => `<tr><th>${premiere}</th>${noms.map((n) => `<th>${notationHtml(n)}</th>`).join('')}</tr>`;

  const lignesPsi = CATEGORIES.map(
    (c) =>
      `<tr><th scope="row">${notationHtml(t.categories[c])} <span class="clause">${clauseDeCle(`psi0:${c}`)}</span></th>` +
      `<td>${champ(`psi0:${c}`)}</td><td>${champ(`psi1:${c}`)}</td><td>${champ(`psi2:${c}`)}</td></tr>`,
  ).join('');
  const lignesJeux = JEUX.map(
    (j) =>
      `<tr><th scope="row">${notationHtml(t.annexe.jeu(NOM_JEU[j]))} <span class="clause">${clauseDeCle(`gSup:${j}`)}</span></th>` +
      `<td>${champ(`gSup:${j}`)}</td><td>${champ(`gInf:${j}`)}</td><td>${champ(`gQ:${j}`)}</td></tr>`,
  ).join('');
  const ligneXi = `<tr><th scope="row">${notationHtml(t.annexe.xi)} <span class="clause">${clauseDeCle('xi')}</span></th><td>${champ('xi')}</td><td></td><td></td></tr>`;

  return (
    `<div class="defilement"><table class="zones"><thead>${entetes(t.entetes.categorie, ['psi_0', 'psi_1', 'psi_2'])}</thead><tbody>${lignesPsi}</tbody></table></div>` +
    `<div class="defilement"><table class="zones"><thead>${entetes(t.entetes.jeu, ['gamma_G,sup', 'gamma_G,inf', 'gamma_Q'])}</thead><tbody>${lignesJeux}${ligneXi}</tbody></table></div>`
  );
}
