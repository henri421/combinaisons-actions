/**
 * Tests d'acceptation de l'etape 8.2 (finitions) : notations, arrondis,
 * accents, titre, phrases types, sur le texte VISIBLE (ecran, note, CSV,
 * page). Le controle lui-meme vit dans aedificium-ui (`constatsAffichage`).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NOMS_GRECS, constatsAffichage, contenuBalise, texteVisible } from 'aedificium-ui';
import { combinerEffets, en1990Recommande, enveloppes, genererCombinaisons, OPTIONS_PAR_DEFAUT, type Options } from '../../src/index';
import { lireModele, saisieParDefaut } from '../../app/src/modele';
import { rendreResultats, tableauActions, tableauGamma, type Resultat } from '../../app/src/vue';
import { combinaisonsEnCsv, noteDeCalculHtml, optionsEnTexte } from '../../app/src/export';

const P = en1990Recommande();
const TITRE = "Combinaisons d'actions";
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');
const controler = (nom: string, html: string): string[] => constatsAffichage(texteVisible(html)).map((c) => `${nom} : ${c}`);

const OPTIONS: Options[] = [
  OPTIONS_PAR_DEFAUT,
  { ...OPTIONS_PAR_DEFAUT, formule: '6.10ab' },
  { ...OPTIONS_PAR_DEFAUT, geoC: true, variablesFavorables: true },
];

function resultat(options: Options): Resultat {
  const s = saisieParDefaut();
  s.options = options;
  s.nomsEffets = 'N ; M';
  s.actions[0].effets = ['100', '10'];
  s.actions[1].effets = ['50', '5'];
  s.actions[2].effets = ['30', '3'];
  s.actions[3].effets = ['-40', '-4'];
  const l = lireModele(s);
  if (!l.ok) throw new Error(l.message);
  const valeurs = combinerEffets(genererCombinaisons(l.actions, l.options, P), l.effets, 2);
  return { actions: l.actions, nomsEffets: l.nomsEffets, valeurs, enveloppes: enveloppes(valeurs, 2) };
}

function sorties() {
  const ecran: string[] = [tableauGamma(P)];
  const notes: string[] = [];
  const csv: string[] = [];
  for (const o of OPTIONS) {
    const r = resultat(o);
    ecran.push(tableauActions(r.actions, P), rendreResultats(r), ...optionsEnTexte(o));
    notes.push(noteDeCalculHtml(r, P, o, 'Essai', '2026-10-24'));
    csv.push(combinaisonsEnCsv(r));
  }
  return { ecran, notes, csv };
}

describe('texte visible : notations, arrondis, accents, phrases types', () => {
  const s = sorties();

  it('ecran', () => {
    expect(s.ecran.flatMap((h, i) => controler(`ecran ${i}`, h))).toEqual([]);
  });

  it('note de calcul', () => {
    expect(s.notes.flatMap((h, i) => controler(`note ${i}`, h))).toEqual([]);
  });

  it('page (index.html)', () => {
    expect(controler('page', lire('../../app/index.html'))).toEqual([]);
  });

  it('messages d erreur affiches', () => {
    const saisie = saisieParDefaut();
    saisie.nomsEffets = 'N ; M';
    saisie.actions[1].effets = ['', 'abc'];
    const l = lireModele(saisie);
    expect(l.ok).toBe(false);
    if (!l.ok) expect(constatsAffichage(texteVisible(l.message))).toEqual([]);
  });

  it('CSV : texte brut, ni « _ » ni nom de lettre grecque ni balise', () => {
    for (const c of s.csv) {
      expect(c).not.toContain('_');
      expect(c).not.toMatch(NOMS_GRECS);
      expect(c).not.toContain('<');
    }
  });
});

describe('titre', () => {
  const page = lire('../../app/index.html');

  it('titre de la page sans tiret, majuscule initiale', () => {
    expect(contenuBalise(page, 'h1')).toBe(TITRE);
    expect(contenuBalise(page, 'title')?.startsWith(TITRE)).toBe(true);
  });

  it('titre en grand', () => {
    const regle = /(^|\n)h1\s*\{([^}]*)\}/.exec(lire('../../app/src/style.css'))?.[2] ?? '';
    expect(regle).toMatch(/font-size:\s*1\.75rem/);
    expect(regle).toMatch(/font-weight:\s*600/);
  });
});
