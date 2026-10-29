/**
 * Mise en forme des resultats. PUR : chaines HTML et tableaux de cellules.
 *
 * L'ecran ET la note de calcul appellent ces memes fonctions : ce que montre
 * l'ecran est, par construction, ce que porte la note. Le CSV et le classeur
 * Excel lisent `lignesDuTableau`, la meme matiere en cellules.
 */

import { notationHtml, nombreAffiche } from 'aedificium-ui';
import {
  FAMILLES,
  formuleLisible,
  type Action,
  type Combinaison,
  type Effets,
  type Enveloppe,
  type Famille,
  type ProfilCombinaisons,
  type ValeurCombinee,
} from '../../src/index';
import { phrase, textes } from './textes';

/** Resultat complet d'un calcul, tel que l'ecran et les sorties le lisent. */
export interface Resultat {
  actions: Action[];
  nomsEffets: string[];
  valeurs: ValeurCombinee[];
  enveloppes: Enveloppe[];
  /** Effets caracteristiques saisis, par action ; absents, la note ne les reprend pas. */
  effets?: Effets;
}

/** Message d'une erreur du noyau ou de la lecture, dans la langue de la page. */
export function messageDErreur(e: unknown): string {
  return phrase(e instanceof Error ? e.message : String(e));
}

/** Formule d'une combinaison (« 1,35 G + 1,5 Q »), au separateur de la langue. */
export function formule(c: Combinaison): string {
  return phrase(formuleLisible(c, noms));
}

/** Nature et categorie d'une action, en clair. */
export function natureDe(a: Action): string {
  const t = textes();
  return a.nature === 'permanente'
    ? `${t.natures.permanente}${a.peutEtreFavorable ? `, ${t.peutEtreFavorable}` : ''}`
    : a.nature === 'accidentelle'
      ? t.natures.accidentelle
      : t.categories[a.categorie];
}

function nombre(x: number | null, decimales = 3): string {
  return x === null ? '—' : nombreAffiche(x, Math.min(decimales, 3));
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
      const nature = natureDe(a);
      const groupe = a.nature === 'variable' && a.groupe !== undefined ? a.groupe : '';
      return (
        `<tr><td>${notationHtml(a.id)}</td><td>${notationHtml(a.nom)}</td><td>${notationHtml(nature)}</td><td>${notationHtml(groupe)}</td>` +
        `<td class="valeur">${psi === null ? '' : nombreAffiche(psi.psi0.valeur, 2)}</td>` +
        `<td class="valeur">${psi === null ? '' : nombreAffiche(psi.psi1.valeur, 2)}</td>` +
        `<td class="valeur">${psi === null ? '' : nombreAffiche(psi.psi2.valeur, 2)}</td></tr>`
      );
    })
    .join('');
  const e = textes().entetes;
  return (
    `<div class="defilement"><table class="zones"><thead><tr><th>${e.id}</th><th>${e.action}</th><th>${e.natureCategorie}</th>` +
    `<th>${e.groupe}</th><th>${notationHtml('psi_0')}</th><th>${notationHtml('psi_1')}</th><th>${notationHtml('psi_2')}</th></tr></thead><tbody>${lignes}</tbody></table></div>`
  );
}

/** Coefficients partiels du profil. */
export function tableauGamma(profil: ProfilCombinaisons): string {
  const ligne = (nom: string, j: ProfilCombinaisons['jeuA']) =>
    `<tr><td>${notationHtml(nom)}</td><td class="valeur">${nombreAffiche(j.gammaGSup.valeur, 2)}</td><td class="valeur">${nombreAffiche(j.gammaGInf.valeur, 2)}</td>` +
    `<td class="valeur">${nombreAffiche(j.gammaQ.valeur, 2)}</td><td class="clause">${notationHtml(phrase(j.gammaQ.source))}</td></tr>`;
  const e = textes().entetes;
  return (
    `<div class="defilement"><table class="zones"><thead><tr><th>${e.jeu}</th>` +
    `<th>${notationHtml('gamma_G,sup')}</th><th>${notationHtml('gamma_G,inf')}</th><th>${notationHtml('gamma_Q')}</th><th>${e.source}</th></tr></thead><tbody>` +
    ligne('A, EQU', profil.jeuA) +
    ligne('B, STR/GEO', profil.jeuB) +
    ligne('C, GEO', profil.jeuC) +
    `<tr><td>${notationHtml('xi (6.10b)')}</td><td class="valeur">${nombreAffiche(profil.xi.valeur, 2)}</td><td></td><td></td><td class="clause">${notationHtml(phrase(profil.xi.source))}</td></tr>` +
    '</tbody></table></div>'
  );
}

/** Les familles presentes, dans l'ordre normatif. */
export function famillesPresentes(valeurs: readonly ValeurCombinee[]): Famille[] {
  return FAMILLES.filter((f) => valeurs.some((v) => v.combinaison.famille === f));
}

/** Tableau HTML d'une famille de combinaisons. */
export function tableauFamille(f: Famille, r: Resultat): string {
  const t = textes();
  const liste = r.valeurs.filter((v) => v.combinaison.famille === f);
  const entetesEffets = r.nomsEffets.map((n) => `<th>${notationHtml(n)}</th>`).join('');
  const lignes = liste
    .map(
      (v) =>
        `<tr><td class="valeur">${v.combinaison.numero}</td><td>${notationHtml(v.combinaison.expression)}</td>` +
        `<td>${notationHtml(v.combinaison.dominante ?? '—')}</td><td>${notationHtml(formule(v.combinaison))}</td>` +
        v.valeurs.map((x) => `<td class="valeur">${nombre(x)}</td>`).join('') +
        '</tr>'
    )
    .join('');
  return (
    `<div class="famille"><h3>${notationHtml(t.familles[f])} <span class="compte">— ${t.compte(liste.length)}</span></h3>` +
    `<div class="defilement"><table class="zones"><thead><tr><th>${t.entetes.numero}</th><th>${t.entetes.expression}</th><th>${t.entetes.dominante}</th><th>${t.entetes.combinaison}</th>` +
    `${entetesEffets}</tr></thead><tbody>${lignes}</tbody></table></div></div>`
  );
}

/** Enveloppe max / min des effets par famille, avec la combinaison qui la donne. */
export function tableauEnveloppes(r: Resultat): string {
  if (r.nomsEffets.length === 0) return '';
  const t = textes();
  const cellule = (e: Enveloppe['max'][number]) =>
    e === null ? '<td class="valeur">—</td>' : `<td class="valeur">${nombre(e.valeur)} <span class="extremum">(${t.numero(e.numero)})</span></td>`;
  const lignes = r.enveloppes
    .flatMap((env) => [
      `<tr><td>${notationHtml(t.familles[env.famille])}</td><td>max</td>${env.max.map(cellule).join('')}</tr>`,
      `<tr><td></td><td>min</td>${env.min.map(cellule).join('')}</tr>`,
    ])
    .join('');
  return (
    `<div class="defilement"><table class="zones"><thead><tr><th>${t.entetes.famille}</th><th></th>` +
    r.nomsEffets.map((n) => `<th>${notationHtml(n)}</th>`).join('') +
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
  const t = textes();
  const e = t.entetes;
  const entete = [e.famille, e.numero, 'Expression', e.dominante, e.combinaison, ...r.actions.map((a) => a.id), ...r.nomsEffets];
  const lignes = r.valeurs
    .filter((v) => familles.includes(v.combinaison.famille))
    .map((v) => {
      const c: Combinaison = v.combinaison;
      const coef = new Map(c.termes.map((t) => [t.action, t.coefficient]));
      return [
        t.familles[c.famille],
        c.numero,
        c.expression,
        c.dominante ?? '',
        formule(c),
        ...r.actions.map((a) => coef.get(a.id) ?? null),
        ...v.valeurs,
      ];
    });
  return [entete, ...lignes];
}
