/**
 * Cablage de l'interface des combinaisons d'actions.
 *
 * Ce module ne calcule RIEN : il tient la saisie, appelle le noyau, et confie
 * a `modele`, `vue` et `export` — tous purs — la lecture de la saisie et la
 * mise en forme. L'ecran et la note appellent les memes fonctions de `vue`.
 */

import { echapper, noteDeCalculHtml, notationHtml, ouvrirOuTelecharger, telecharger } from 'aedificium-ui';
import {
  CATEGORIES,
  LIBELLES_CATEGORIES,
  actionsClimatiques,
  combinerEffets,
  en1990Recommande,
  enveloppes,
  genererCombinaisons,
  type Categorie,
  type Options,
} from '../../src/index';
import { identifiantLibre, lireModele, nomsDesEffets, relire, saisieParDefaut, serialiser, type LigneAction, type Nature, type Saisie } from './modele';
import { messageDErreur, rendreResultats, tableauActions, tableauEnveloppes, tableauGamma, type Resultat } from './vue';
import { combinaisonsEnCsv, combinaisonsEnXlsx } from './export';
import { noteDuCalcul } from './note';
import './style.css';

const PROFIL = en1990Recommande();
const CLE_STOCKAGE = 'combinaisons-actions/saisie';
const CLE_CARTOUCHE = 'combinaisons-actions:cartouche';

function exige<T extends Element>(selecteur: string): T {
  const e = document.querySelector<T>(selecteur);
  if (e === null) throw new Error(`Élément absent de la page : ${selecteur}`);
  return e;
}

const formulaire = exige<HTMLFormElement>('#formulaire');
const zones = {
  editeur: exige<HTMLElement>('[data-role="editeur"]'),
  erreur: exige<HTMLElement>('[data-role="erreur"]'),
  actions: exige<HTMLElement>('[data-role="actions"]'),
  gamma: exige<HTMLElement>('[data-role="gamma"]'),
  resultats: exige<HTMLElement>('[data-role="resultats"]'),
  enveloppes: exige<HTMLElement>('[data-role="enveloppes"]'),
  sectionEnveloppes: exige<HTMLElement>('[data-role="section-enveloppes"]'),
};
const champEffets = exige<HTMLInputElement>('[data-champ="nomsEffets"]');
const categorieNeige = exige<HTMLSelectElement>('[data-role="categorie-neige"]');
const sectionSorties = exige<HTMLElement>('#sorties');
const champProjet = exige<HTMLInputElement>('[data-role="projet"]');
const champElement = exige<HTMLInputElement>('[data-role="element"]');

let saisie: Saisie = charger() ?? saisieParDefaut();
let dernier: Resultat | null = null;

// --- Stockage local ---------------------------------------------------------------

function charger(): Saisie | null {
  try {
    const t = window.localStorage.getItem(CLE_STOCKAGE);
    return t === null ? null : relire(t);
  } catch {
    return null;
  }
}

function memoriser(): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, serialiser(saisie));
  } catch {
    // Stockage indisponible (navigation privee) : la page fonctionne sans.
  }
}

/** Cartouche de la note : champs absents ou illisibles valent chaine vide. */
function lireCartouche(): { projet: string; element: string } {
  try {
    const t = window.localStorage.getItem(CLE_CARTOUCHE);
    const o = t === null ? null : (JSON.parse(t) as Record<string, unknown> | null);
    return {
      projet: typeof o?.projet === 'string' ? o.projet : '',
      element: typeof o?.element === 'string' ? o.element : '',
    };
  } catch {
    return { projet: '', element: '' };
  }
}

// --- Editeur ----------------------------------------------------------------------

function optionsCategorie(choisie: Categorie): string {
  return CATEGORIES.map((c) => `<option value="${c}"${c === choisie ? ' selected' : ''}>${notationHtml(LIBELLES_CATEGORIES[c])}</option>`).join('');
}

function ligneEditeur(l: LigneAction, i: number, noms: string[]): string {
  const champ = (nom: string, valeur: string, classe = '') =>
    `<input type="text" class="${classe}" data-ligne="${i}" data-champ="${nom}" value="${echapper(valeur)}" aria-label="${nom}, action ${i + 1}" />`;
  const nature = ['permanente', 'variable', 'accidentelle']
    .map((n) => `<option value="${n}"${n === l.nature ? ' selected' : ''}>${n}</option>`)
    .join('');
  const detail =
    l.nature === 'variable'
      ? `<select data-ligne="${i}" data-champ="categorie" aria-label="catégorie, action ${i + 1}">${optionsCategorie(l.categorie)}</select>`
      : l.nature === 'permanente'
        ? `<label class="case"><input type="checkbox" data-ligne="${i}" data-champ="peutEtreFavorable"${l.peutEtreFavorable ? ' checked' : ''} /><span>peut être favorable</span></label>`
        : '';
  const groupe = l.nature === 'variable' ? champ('groupe', l.groupe) : '';
  const effets = noms.map((_, k) => `<td>${champ(`effet-${k}`, l.effets[k] ?? '', 'effet')}</td>`).join('');
  return (
    `<tr><td>${champ('id', l.id, 'id')}</td><td>${champ('nom', l.nom)}</td>` +
    `<td><select data-ligne="${i}" data-champ="nature" data-structure="1" aria-label="nature, action ${i + 1}">${nature}</select></td>` +
    `<td>${detail}</td><td>${groupe}</td>${effets}` +
    `<td><button type="button" class="retirer" data-action="retirer" data-ligne="${i}" aria-label="retirer l'action ${i + 1}">×</button></td></tr>`
  );
}

function rendreEditeur(): void {
  const noms = nomsDesEffets(saisie);
  zones.editeur.innerHTML =
    '<table class="actions"><thead><tr><th>Id</th><th>Nom</th><th>Nature</th><th>Catégorie</th><th>Groupe</th>' +
    noms.map((n) => `<th>${notationHtml(n)}</th>`).join('') +
    '<th></th></tr></thead><tbody>' +
    saisie.actions.map((l, i) => ligneEditeur(l, i, noms)).join('') +
    '</tbody></table>';
}

function ecrireOptions(): void {
  champEffets.value = saisie.nomsEffets;
  for (const e of formulaire.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-option]')) {
    const cle = e.dataset.option as keyof Options;
    const v = saisie.options[cle];
    if (e instanceof HTMLInputElement && e.type === 'checkbox') e.checked = v === true;
    else e.value = String(v);
  }
}

// --- Calcul -----------------------------------------------------------------------

function montrerErreur(message: string | null): void {
  zones.erreur.hidden = message === null;
  zones.erreur.textContent = message ?? '';
}

/**
 * Recalcule et repeint. Une saisie illisible laisse en place le dernier
 * resultat valide, sous une erreur bien visible.
 */
function recalculer(): void {
  memoriser();
  const lecture = lireModele(saisie);
  if (!lecture.ok) return montrerErreur(lecture.message);
  try {
    const combinaisons = genererCombinaisons(lecture.actions, lecture.options, PROFIL);
    const valeurs = combinerEffets(combinaisons, lecture.effets, lecture.nomsEffets.length);
    dernier = { actions: lecture.actions, nomsEffets: lecture.nomsEffets, effets: lecture.effets, valeurs, enveloppes: enveloppes(valeurs, lecture.nomsEffets.length) };
  } catch (e) {
    return montrerErreur(messageDErreur(e));
  }
  montrerErreur(null);
  zones.actions.innerHTML = tableauActions(dernier.actions, PROFIL);
  zones.gamma.innerHTML = tableauGamma(PROFIL);
  zones.resultats.innerHTML = rendreResultats(dernier);
  const env = tableauEnveloppes(dernier);
  zones.sectionEnveloppes.hidden = env === '';
  zones.enveloppes.innerHTML = env;
}

// --- Evenements -------------------------------------------------------------------

formulaire.addEventListener('input', (evenement) => {
  const cible = evenement.target;
  if (!(cible instanceof HTMLInputElement || cible instanceof HTMLSelectElement)) return;

  if (cible.dataset.option !== undefined) {
    const cle = cible.dataset.option as keyof Options;
    const valeur = cible instanceof HTMLInputElement && cible.type === 'checkbox' ? cible.checked : cible.value;
    saisie.options = { ...saisie.options, [cle]: valeur } as Options;
    return recalculer();
  }

  if (cible.dataset.champ === 'nomsEffets') {
    saisie.nomsEffets = cible.value;
    // La structure de l'editeur (une colonne par effet) change : on la
    // reconstruit, en gardant le focus dans ce champ, qui est hors du tableau.
    rendreEditeur();
    return recalculer();
  }

  const i = Number(cible.dataset.ligne);
  const ligne = saisie.actions[i];
  const champ = cible.dataset.champ;
  if (ligne === undefined || champ === undefined) return;

  if (champ === 'peutEtreFavorable' && cible instanceof HTMLInputElement) ligne.peutEtreFavorable = cible.checked;
  else if (champ === 'nature') ligne.nature = cible.value as Nature;
  else if (champ === 'categorie') ligne.categorie = cible.value as Categorie;
  else if (champ.startsWith('effet-')) ligne.effets[Number(champ.slice(6))] = cible.value;
  else if (champ === 'id' || champ === 'nom' || champ === 'groupe') ligne[champ] = cible.value;

  // Changer la nature change les colonnes de la ligne : on reconstruit.
  if (cible.dataset.structure === '1') rendreEditeur();
  recalculer();
});

// `change` couvre les listes deroulantes et cases que certains navigateurs ne
// signalent pas par `input`.
formulaire.addEventListener('change', (evenement) => {
  const cible = evenement.target;
  if (cible instanceof HTMLSelectElement || (cible instanceof HTMLInputElement && cible.type === 'checkbox')) {
    cible.dispatchEvent(new Event('input', { bubbles: true }));
  }
});

// Le cartouche vit hors du formulaire de saisie : le modifier ne relance pas le calcul.
sectionSorties.addEventListener('input', () => {
  try {
    window.localStorage.setItem(CLE_CARTOUCHE, JSON.stringify({ projet: champProjet.value, element: champElement.value }));
  } catch {
    // Stockage indisponible : la note lit directement les champs.
  }
});

function ajouter(nature: Nature): void {
  saisie.actions.push({
    id: identifiantLibre(saisie, nature),
    nom: '',
    nature,
    categorie: 'A',
    groupe: '',
    peutEtreFavorable: false,
    effets: [],
  });
  rendreEditeur();
  recalculer();
}

/** Telechargement d'octets (le classeur) : `telecharger` d'aedificium-ui ne prend que du texte. */
function telechargerOctets(nom: string, octets: Uint8Array, type: string): void {
  // Copie dans un ArrayBuffer propre : le type BlobPart refuse un tampon
  // potentiellement partage (SharedArrayBuffer).
  const tampon = octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([tampon], { type }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener('click', (evenement) => {
  const cible = evenement.target;
  if (!(cible instanceof HTMLElement)) return;
  const action = cible.dataset.action;
  if (action === undefined) return;

  if (action === 'ajouter-permanente') return ajouter('permanente');
  if (action === 'ajouter-variable') return ajouter('variable');
  if (action === 'ajouter-accidentelle') return ajouter('accidentelle');
  if (action === 'retirer') {
    saisie.actions.splice(Number(cible.dataset.ligne), 1);
    rendreEditeur();
    return recalculer();
  }
  if (action === 'enregistrer') {
    return telecharger('combinaisons-actions.json', serialiser(saisie), 'application/json;charset=utf-8');
  }
  if (action === 'reinitialiser') {
    saisie = saisieParDefaut();
    ecrireOptions();
    rendreEditeur();
    return recalculer();
  }

  if (!action.startsWith('exporter-')) return;
  if (dernier === null) return montrerErreur('Aucune combinaison valide à exporter : corriger la saisie.');
  const date = new Date().toISOString().slice(0, 10);
  if (action === 'exporter-csv') {
    telecharger('combinaisons.csv', combinaisonsEnCsv(dernier), 'text/csv;charset=utf-8');
  } else if (action === 'exporter-xlsx') {
    telechargerOctets('combinaisons.xlsx', combinaisonsEnXlsx(dernier, PROFIL), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } else if (action === 'exporter-note') {
    const cartouche = { projet: champProjet.value, element: champElement.value, date };
    ouvrirOuTelecharger('combinaisons-note.html', noteDeCalculHtml(noteDuCalcul(PROFIL, dernier, saisie.options, cartouche)));
  }
});

async function lireFichier(entree: HTMLInputElement): Promise<string | null> {
  const f = entree.files?.[0];
  entree.value = '';
  return f === undefined ? null : f.text();
}

exige<HTMLInputElement>('[data-role="ouvrir"]').addEventListener('change', async (e) => {
  const texte = await lireFichier(e.target as HTMLInputElement);
  if (texte === null) return;
  try {
    saisie = relire(texte);
  } catch (err) {
    return montrerErreur(messageDErreur(err));
  }
  ecrireOptions();
  rendreEditeur();
  recalculer();
});

exige<HTMLInputElement>('[data-role="importer"]').addEventListener('change', async (e) => {
  const texte = await lireFichier(e.target as HTMLInputElement);
  if (texte === null) return;
  try {
    const r = actionsClimatiques(texte, categorieNeige.value === 'neige-haute' ? 'neige-haute' : 'neige');
    // Les actions importees remplacent la neige et le vent deja saisis.
    saisie.actions = saisie.actions.filter((a) => !(a.nature === 'variable' && (a.categorie === 'vent' || a.categorie === 'neige' || a.categorie === 'neige-haute')));
    for (const a of r.actions) {
      saisie.actions.push({ id: a.id, nom: a.nom, nature: 'variable', categorie: a.categorie, groupe: a.groupe ?? '', peutEtreFavorable: false, effets: [] });
    }
    rendreEditeur();
    recalculer();
    if (r.ignores.length > 0) montrerErreur(r.ignores.join(' '));
  } catch (err) {
    montrerErreur(messageDErreur(err));
  }
});

const cartouche = lireCartouche();
champProjet.value = cartouche.projet;
champElement.value = cartouche.element;

ecrireOptions();
rendreEditeur();
recalculer();

// Hors navigateur (tests), pas de service worker.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void import('./pwa').then((m) => m.enregistrerServiceWorker());
}
