/**
 * Version anglaise (lot 8.8) : page `en/index.html` de meme squelette que la
 * page francaise, et AUCUN reste de francais dans ce qui s'affiche en anglais
 * (ecran, editeur, note, CSV, classeur, messages). Le francais, lui, est
 * couvert par `finitions.test.ts`, inchange.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { constatsAffichage, contenuBalise, definirLangue, noteDeCalculHtml, notationHtml, texteVisible } from 'aedificium-ui';
import { CATEGORIES, FAMILLES, OPTIONS_PAR_DEFAUT, actionsClimatiques, combinerEffets, en1990Recommande, enveloppes, genererCombinaisons, type Options } from '../../src/index';
import { lireModele, relire, saisieParDefaut, type Saisie } from '../../app/src/modele';
import { messageDErreur, rendreResultats, tableauActions, tableauEnveloppes, tableauGamma, type Resultat } from '../../app/src/vue';
import { combinaisonsEnCsv } from '../../app/src/export';
import { noteDuCalcul, optionsEnTexte } from '../../app/src/note';
import { textes } from '../../app/src/textes';

const P = en1990Recommande();
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');
const controler = (nom: string, html: string): string[] => constatsAffichage(texteVisible(html), { langue: 'en' }).map((c) => `${nom} : ${c}`);
/** CSV : la virgule y est le separateur, pas une virgule decimale. */
const controlerCsv = (nom: string, csv: string): string[] =>
  constatsAffichage(csv, { langue: 'en' })
    .filter((c) => !c.startsWith('virgule decimale'))
    .map((c) => `${nom} : ${c}`);

/** Squelette d'une page : les attributs que lit le script, dans l'ordre. */
function squelette(html: string): string[] {
  return [...html.matchAll(/\s(id|data-[a-z-]+|type|inputmode|accept|value)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
}

const OPTIONS: Options[] = [
  OPTIONS_PAR_DEFAUT,
  { ...OPTIONS_PAR_DEFAUT, formule: '6.10ab' },
  { ...OPTIONS_PAR_DEFAUT, geoC: true, equ: true, variablesFavorables: true },
  { ...OPTIONS_PAR_DEFAUT, accidentelle: true, psiAccidentelle: 'psi2', els: true },
  { ...OPTIONS_PAR_DEFAUT, equ: false, geoC: false, accidentelle: false, els: false },
];

function saisie(options: Options): Saisie {
  const s = saisieParDefaut();
  s.options = options;
  s.nomsEffets = 'N ; M';
  s.actions[0].effets = ['100', '10'];
  s.actions[0].peutEtreFavorable = true;
  s.actions[1].effets = ['50', '5'];
  s.actions[2].effets = ['30', '3'];
  s.actions[3].effets = ['-40', '-4'];
  s.actions.push({ id: 'A1', nom: 'Impact', nature: 'accidentelle', categorie: 'A', groupe: '', peutEtreFavorable: false, effets: ['200', '0'] });
  return s;
}

function resultat(s: Saisie): Resultat {
  const l = lireModele(s);
  if (!l.ok) throw new Error(l.message);
  const valeurs = combinerEffets(genererCombinaisons(l.actions, l.options, P), l.effets, 2);
  return { actions: l.actions, nomsEffets: l.nomsEffets, valeurs, enveloppes: enveloppes(valeurs, 2), effets: l.effets };
}

function erreur(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return messageDErreur(e);
  }
  throw new Error('une erreur etait attendue');
}

describe('page anglaise', () => {
  const fr = lire('../../app/index.html');
  const en = lire('../../app/en/index.html');

  it('meme squelette que la page francaise', () => {
    expect(squelette(en)).toEqual(squelette(fr));
  });

  it('langue, script commun, liens entre les deux versions', () => {
    expect(en).toContain('<html lang="en">');
    expect(en).toContain('src="../src/main.ts"');
    expect(en).toMatch(/class="barre-langue" href="\.\.\/"/);
    expect(fr).toMatch(/class="barre-langue" href="en\/"/);
  });

  it('titre anglais, aucun reste de francais', () => {
    expect(contenuBalise(en, 'h1')).toBe('Combinations of actions');
    expect(controler('page', en.replace(/lang="fr"[^>]*>FR</, '>'))).toEqual([]);
  });
});

describe('affichage en anglais', () => {
  beforeEach(() => definirLangue('en'));
  afterEach(() => definirLangue('fr'));

  it('ecran, note et CSV', () => {
    const constats: string[] = [...controler('gamma', tableauGamma(P))];
    OPTIONS.forEach((o, i) => {
      const r = resultat(saisie(o));
      constats.push(...controler(`cas ${i} ecran`, tableauActions(r.actions, P) + rendreResultats(r) + tableauEnveloppes(r)));
      constats.push(...controler(`cas ${i} options`, notationHtml(optionsEnTexte(o).join(' '))));
      constats.push(...controler(`cas ${i} note`, noteDeCalculHtml(noteDuCalcul(P, r, o, { projet: 'Test', element: '', date: '2026-10-29' }))));
      constats.push(...controlerCsv(`cas ${i} csv`, combinaisonsEnCsv(r)));
    });
    expect(constats).toEqual([]);
  });

  it('formules a point decimal', () => {
    const r = resultat(saisie(OPTIONS_PAR_DEFAUT));
    expect(texteVisible(rendreResultats(r))).toMatch(/1\.35 G \+ 1\.5 Q/);
  });

  it('libelles de l editeur et actions par defaut', () => {
    const t = textes();
    const libelles = [
      ...CATEGORIES.map((c) => t.categories[c]),
      ...FAMILLES.map((f) => t.familles[f]),
      ...Object.values(t.natures),
      t.peutEtreFavorable,
      ...Object.values(t.entetes),
      ...saisieParDefaut().actions.map((a) => a.nom),
    ];
    expect(controler('libelles', libelles.map((l) => `<p>${notationHtml(l)}</p>`).join(''))).toEqual([]);
  });

  it('messages et erreurs', () => {
    const s = saisieParDefaut();
    s.nomsEffets = 'N';
    s.actions[1].effets = ['abc'];
    const lecture = lireModele(s);
    const sansId = saisieParDefaut();
    sansId.actions[0].id = ' ';
    const lectureId = lireModele(sansId);
    const lu = lireModele(saisieParDefaut());
    if (!lu.ok) throw new Error(lu.message);
    const actions = lu.actions;
    const climat = actionsClimatiques(
      JSON.stringify({ format: 'charges-climatiques/1', unites: {}, profil: { nom: 'p', date: 'd' }, neige: { nonCalcule: 's_k absente' }, vent: { nonCalcule: 'v_b,0 absente' } }),
      'neige'
    );
    const messages = [
      lecture.ok ? '' : lecture.message,
      lectureId.ok ? '' : lectureId.message,
      erreur(() => relire('{"format":"autre"}')),
      erreur(() => genererCombinaisons([], OPTIONS_PAR_DEFAUT, P)),
      erreur(() => genererCombinaisons([actions[0], actions[0]], OPTIONS_PAR_DEFAUT, P)),
      erreur(() => genererCombinaisons(actions, { ...OPTIONS_PAR_DEFAUT, accidentelle: true }, P)),
      erreur(() => actionsClimatiques('{ pas du json', 'neige')),
      erreur(() => actionsClimatiques(JSON.stringify({ format: 'autre/1' }), 'neige')),
      ...climat.ignores.map((m) => messageDErreur(m)),
      textes().messages.rienAExporter,
      textes().messages.nouvelleVersion,
    ];
    expect(messages.flatMap((m, i) => controler(`message ${i}`, notationHtml(m)))).toEqual([]);
  });
});
