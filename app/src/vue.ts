/**
 * Mise en forme des resultats. PUR : chaines HTML et tableaux de cellules.
 *
 * L'ecran ET la note de calcul appellent ces memes fonctions : ce que montre
 * l'ecran est, par construction, ce que porte la note. Le CSV et le classeur
 * Excel lisent `lignesDuTableau`, la meme matiere en cellules.
 */

import { echapper, nombreFr } from 'aedificium-ui';
import {
  FAMILLES,
  LIBELLES_CATEGORIES,
  LIBELLES_FAMILLES,
  formuleLisible,
  type Action,
  type Combinaison,
  type Enveloppe,
  type Famille,
  type ProfilCombinaisons,
  type ValeurCombinee,
} from '../../src/index';

/** Resultat complet d'un calcul, tel que l'ecran et les sorties le lisent. */
export interface Resultat {
  actions: Action[];
  nomsEffets: string[];
  valeurs: ValeurCombinee[];
  enveloppes: Enveloppe[];
}

export function messageDErreur(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function nombre(x: number | null, decimales = 3): string {
  return x === null ? '—' : nombreFr(x, decimales);
}

/** Libelle court d'une action dans les formules : son identifiant. */
function noms(id: string): string {
  return id;
}

/** Les actions retenues, avec leurs psi. */
export function tableauActions(actions: readonly Action[], profil: ProfilCombinaisons): string {
  const lignes = actions
    .map((a) => {
      const psi = a.nature === 'variable' ? profil.psi[a.categorie] : null;
      const nature =
        a.nature === 'permanente'
          ? `permanente${a.peutEtreFavorable ? ', peut etre favorable' : ''}`
          : a.nature === 'accidentelle'
            ? 'accidentelle'
            : LIBELLES_CATEGORIES[a.categorie];
      const groupe = a.nature === 'variable' && a.groupe !== undefined ? a.groupe : '';
      return (
        `<tr><td>${echapper(a.id)}</td><td>${echapper(a.nom)}</td><td>${echapper(nature)}</td><td>${echapper(groupe)}</td>` +
        `<td class="valeur">${psi === null ? '' : nombreFr(psi.psi0.valeur, 2)}</td>` +
        `<td class="valeur">${psi === null ? '' : nombreFr(psi.psi1.valeur, 2)}</td>` +
        `<td class="valeur">${psi === null ? '' : nombreFr(psi.psi2.valeur, 2)}</td></tr>`
      );
    })
    .join('');
  return (
    '<div class="defilement"><table class="zones"><thead><tr><th>Id</th><th>Action</th><th>Nature, categorie</th>' +
    `<th>Groupe</th><th>psi_0</th><th>psi_1</th><th>psi_2</th></tr></thead><tbody>${lignes}</tbody></table></div>`
  );
}

/** Coefficients partiels du profil. */
export function tableauGamma(profil: ProfilCombinaisons): string {
  const ligne = (nom: string, j: ProfilCombinaisons['jeuA']) =>
    `<tr><td>${nom}</td><td class="valeur">${nombreFr(j.gammaGSup.valeur, 2)}</td><td class="valeur">${nombreFr(j.gammaGInf.valeur, 2)}</td>` +
    `<td class="valeur">${nombreFr(j.gammaQ.valeur, 2)}</td><td class="clause">${echapper(j.gammaQ.source)}</td></tr>`;
  return (
    '<div class="defilement"><table class="zones"><thead><tr><th>Jeu</th><th>gamma_G,sup</th><th>gamma_G,inf</th><th>gamma_Q</th><th>Source</th></tr></thead><tbody>' +
    ligne('A, EQU', profil.jeuA) +
    ligne('B, STR/GEO', profil.jeuB) +
    ligne('C, GEO', profil.jeuC) +
    `<tr><td>xi (6.10b)</td><td class="valeur">${nombreFr(profil.xi.valeur, 2)}</td><td></td><td></td><td class="clause">${echapper(profil.xi.source)}</td></tr>` +
    '</tbody></table></div>'
  );
}

/** Les familles presentes, dans l'ordre normatif. */
export function famillesPresentes(valeurs: readonly ValeurCombinee[]): Famille[] {
  return FAMILLES.filter((f) => valeurs.some((v) => v.combinaison.famille === f));
}

/** Tableau HTML d'une famille de combinaisons. */
export function tableauFamille(f: Famille, r: Resultat): string {
  const liste = r.valeurs.filter((v) => v.combinaison.famille === f);
  const entetesEffets = r.nomsEffets.map((n) => `<th>${echapper(n)}</th>`).join('');
  const lignes = liste
    .map(
      (v) =>
        `<tr><td class="valeur">${v.combinaison.numero}</td><td>${v.combinaison.expression}</td>` +
        `<td>${echapper(v.combinaison.dominante ?? '—')}</td><td>${echapper(formuleLisible(v.combinaison, noms))}</td>` +
        v.valeurs.map((x) => `<td class="valeur">${nombre(x)}</td>`).join('') +
        '</tr>'
    )
    .join('');
  return (
    `<div class="famille"><h3>${echapper(LIBELLES_FAMILLES[f])} <span class="compte">— ${liste.length} combinaison${liste.length > 1 ? 's' : ''}</span></h3>` +
    '<div class="defilement"><table class="zones"><thead><tr><th>N°</th><th>Expr.</th><th>Dominante</th><th>Combinaison</th>' +
    `${entetesEffets}</tr></thead><tbody>${lignes}</tbody></table></div></div>`
  );
}

/** Enveloppe max / min des effets par famille, avec la combinaison qui la donne. */
export function tableauEnveloppes(r: Resultat): string {
  if (r.nomsEffets.length === 0) return '';
  const cellule = (e: Enveloppe['max'][number]) =>
    e === null ? '<td class="valeur">—</td>' : `<td class="valeur">${nombre(e.valeur)} <span class="extremum">(n° ${e.numero})</span></td>`;
  const lignes = r.enveloppes
    .flatMap((env) => [
      `<tr><td>${echapper(LIBELLES_FAMILLES[env.famille])}</td><td>max</td>${env.max.map(cellule).join('')}</tr>`,
      `<tr><td></td><td>min</td>${env.min.map(cellule).join('')}</tr>`,
    ])
    .join('');
  return (
    '<div class="defilement"><table class="zones"><thead><tr><th>Famille</th><th></th>' +
    r.nomsEffets.map((n) => `<th>${echapper(n)}</th>`).join('') +
    `</tr></thead><tbody>${lignes}</tbody></table></div>`
  );
}

/** Tous les tableaux de resultats, dans l'ordre de l'ecran et de la note. */
export function rendreResultats(r: Resultat): string {
  return famillesPresentes(r.valeurs)
    .map((f) => tableauFamille(f, r))
    .join('');
}

/**
 * Le tableau des combinaisons en cellules, pour le CSV et le classeur : une
 * ligne par combinaison, une colonne par action (son coefficient), puis les
 * effets combines.
 */
export function lignesDuTableau(r: Resultat, familles: readonly Famille[] = FAMILLES): Array<Array<string | number | null>> {
  const entete = ['Famille', 'N°', 'Expression', 'Dominante', 'Combinaison', ...r.actions.map((a) => a.id), ...r.nomsEffets];
  const lignes = r.valeurs
    .filter((v) => familles.includes(v.combinaison.famille))
    .map((v) => {
      const c: Combinaison = v.combinaison;
      const coef = new Map(c.termes.map((t) => [t.action, t.coefficient]));
      return [
        LIBELLES_FAMILLES[c.famille],
        c.numero,
        c.expression,
        c.dominante ?? '',
        formuleLisible(c, noms),
        ...r.actions.map((a) => coef.get(a.id) ?? null),
        ...v.valeurs,
      ];
    });
  return [entete, ...lignes];
}
