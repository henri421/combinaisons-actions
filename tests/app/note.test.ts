/**
 * Tests d'acceptation du lot 8.7 : la note de calcul passe sur la note
 * commune d'aedificium-ui (cartouche, sections dans l'ordre fixe, memes
 * tableaux que l'ecran, pas de conclusions : rien n'est verifie ici).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { noteDeCalculHtml, texteVisible, type ElementNote } from 'aedificium-ui';
import { combinerEffets, en1990Recommande, enveloppes, genererCombinaisons, OPTIONS_PAR_DEFAUT, type Options } from '../../src/index';
import { lireModele, saisieParDefaut } from '../../app/src/modele';
import { famillesPresentes, lignesDuTableau, type Resultat } from '../../app/src/vue';
import { HYPOTHESES, noteDuCalcul, optionsEnTexte } from '../../app/src/note';

const P = en1990Recommande();
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');
const CARTOUCHE = { projet: 'Halle', element: 'Portique P2', date: '2026-10-27' };

function resultat(options: Options = OPTIONS_PAR_DEFAUT, avecEffets = true): Resultat {
  const s = saisieParDefaut();
  s.options = options;
  if (avecEffets) {
    s.nomsEffets = 'N ; M';
    s.actions[0].effets = ['100', '10'];
    s.actions[1].effets = ['50', '5'];
    s.actions[2].effets = ['30', ''];
    s.actions[3].effets = ['-40', '-4'];
  } else {
    s.nomsEffets = '';
    for (const a of s.actions) a.effets = [];
  }
  const l = lireModele(s);
  if (!l.ok) throw new Error(l.message);
  const n = l.nomsEffets.length;
  const valeurs = combinerEffets(genererCombinaisons(l.actions, l.options, P), l.effets, n);
  return { actions: l.actions, nomsEffets: l.nomsEffets, valeurs, enveloppes: enveloppes(valeurs, n), effets: l.effets };
}

const tableaux = (els: ElementNote[] | undefined) => (els ?? []).flatMap((e) => (e.type === 'tableau' ? [e] : []));
const r = resultat();
const note = noteDuCalcul(P, r, OPTIONS_PAR_DEFAUT, CARTOUCHE);
const html = noteDeCalculHtml(note);

describe('cartouche', () => {
  it('projet, element, date, norme et outil', () => {
    expect(note.cartouche).toEqual({ ...CARTOUCHE, norme: 'EN 1990:2002, annexe A1', outil: 'combinaisons-actions' });
  });

  it("element vide : Combinaisons d'actions", () => {
    expect(noteDuCalcul(P, r, OPTIONS_PAR_DEFAUT, { ...CARTOUCHE, element: '' }).cartouche.element).toBe("Combinaisons d'actions");
  });

  it('le texte du cartouche est echappe', () => {
    const h = noteDeCalculHtml(noteDuCalcul(P, r, OPTIONS_PAR_DEFAUT, { ...CARTOUCHE, projet: 'Halle <test>' }));
    expect(h).toContain('Halle &lt;test&gt;');
    expect(h).not.toContain('Halle <test>');
  });
});

describe('sections', () => {
  it('ordre fixe, sans geometrie, materiaux ni conclusions', () => {
    const titres = [...html.matchAll(/<h2>([^<]*)<\/h2>/g)].map((x) => x[1]);
    expect(titres).toEqual(['1. Hypothèses', '2. Cas de charges', '3. Combinaisons de charges', '4. Calculs et vérifications']);
    expect(note.verifications).toEqual([]);
  });

  it('sans effet saisi : pas de section de calculs', () => {
    const h = noteDeCalculHtml(noteDuCalcul(P, resultat(OPTIONS_PAR_DEFAUT, false), OPTIONS_PAR_DEFAUT, CARTOUCHE));
    const titres = [...h.matchAll(/<h2>([^<]*)<\/h2>/g)].map((x) => x[1]);
    expect(titres).toEqual(['1. Hypothèses', '2. Cas de charges', '3. Combinaisons de charges']);
  });

  it('aucun verdict', () => {
    const t = texteVisible(html);
    expect(t).not.toContain('Conforme');
    expect(t).not.toContain('Vérification déterminante');
  });
});

describe('hypotheses', () => {
  const h = note.sections.hypotheses ?? [];

  it('profil, coefficients partiels, options, hypotheses', () => {
    expect(h.some((e) => e.type === 'texte' && e.texte.includes(P.nom) && e.texte.includes(P.date))).toBe(true);
    const listes = h.flatMap((e) => (e.type === 'liste' ? [e.items] : []));
    expect(listes).toEqual([optionsEnTexte(OPTIONS_PAR_DEFAUT), HYPOTHESES]);
  });

  it('coefficients partiels : trois jeux et xi', () => {
    const t = tableaux(h);
    expect(t).toHaveLength(1);
    expect(t[0].entetes).toEqual(['Jeu', 'gamma_G,sup', 'gamma_G,inf', 'gamma_Q', 'Source']);
    expect(t[0].lignes.map((l) => l[0])).toEqual(['A, EQU', 'B, STR/GEO', 'C, GEO', 'xi (6.10b)']);
    expect(t[0].lignes[1].slice(1, 4)).toEqual(['1,35', '1', '1,5']);
  });
});

describe('cas de charges', () => {
  const t = tableaux(note.sections.charges);

  it('actions avec leurs psi, puis effets saisis', () => {
    expect(t.map((x) => x.titre)).toEqual(['Actions', 'Effets caractéristiques saisis']);
    expect(t[0].entetes).toEqual(['Id', 'Action', 'Nature, catégorie', 'Groupe', 'psi_0', 'psi_1', 'psi_2']);
    expect(t[0].lignes.map((l) => l[0])).toEqual(['G', 'Q', 'S', 'W']);
    // Permanente : pas de psi.
    expect(t[0].lignes[0].slice(4)).toEqual(['', '', '']);
    expect(t[0].lignes[1].slice(4)).toEqual(['0,7', '0,5', '0,3']);
  });

  it('effets : une ligne par action, une colonne par effet, — si non saisi', () => {
    expect(t[1].entetes).toEqual(['Action', 'N', 'M']);
    expect(t[1].lignes).toEqual([
      ['G', '100', '10'],
      ['Q', '50', '5'],
      ['S', '30', '—'],
      ['W', '-40', '-4'],
    ]);
  });

  it('effets inconnus du resultat : tableau omis', () => {
    const { effets: _e, ...sans } = r;
    expect(tableaux(noteDuCalcul(P, sans, OPTIONS_PAR_DEFAUT, CARTOUCHE).sections.charges).map((x) => x.titre)).toEqual(['Actions']);
  });
});

describe('combinaisons', () => {
  for (const o of [OPTIONS_PAR_DEFAUT, { ...OPTIONS_PAR_DEFAUT, formule: '6.10ab' as const, geoC: true, variablesFavorables: true }]) {
    it(`un tableau par famille presente, dans l ordre (${o.formule})`, () => {
      const rr = resultat(o);
      const t = tableaux(noteDuCalcul(P, rr, o, CARTOUCHE).sections.combinaisons);
      const familles = famillesPresentes(rr.valeurs);
      expect(t).toHaveLength(familles.length);
      expect(t.reduce((n, x) => n + x.lignes.length, 0)).toBe(rr.valeurs.length);
    });
  }

  it('memes numeros, expressions, dominantes, formules et valeurs que le CSV', () => {
    const csv = lignesDuTableau(r).slice(1);
    const lignes = tableaux(note.sections.combinaisons).flatMap((x) => x.lignes);
    const nA = r.actions.length;
    expect(lignes.map((l) => l.slice(0, 4))).toEqual(csv.map((l) => [String(l[1]), l[2], l[3] === '' ? '—' : l[3], l[4]]));
    // Les effets combines, apres les coefficients des actions dans le CSV.
    expect(lignes.map((l) => l.slice(4).length)).toEqual(csv.map((l) => l.slice(5 + nA).length));
  });

  it('titre : famille et nombre de combinaisons', () => {
    const t = tableaux(note.sections.combinaisons);
    expect(t[0].titre).toMatch(/— \d+ combinaisons?$/);
    expect(t[0].entetes).toEqual(['N°', 'Expr.', 'Dominante', 'Combinaison', 'N', 'M']);
  });
});

describe('calculs', () => {
  it('enveloppes : max puis min par famille, avec le numero', () => {
    const t = tableaux(note.sections.calculs);
    expect(t).toHaveLength(1);
    expect(t[0].entetes).toEqual(['Famille', 'Extremum', 'N', 'M']);
    expect(t[0].lignes).toHaveLength(2 * r.enveloppes.length);
    expect(t[0].lignes[0][1]).toBe('max');
    expect(t[0].lignes[1][0]).toBe('');
    expect(t[0].lignes[0][2]).toMatch(/\(n° \d+\)$/);
  });
});

describe('cablage', () => {
  const main = lire('../../app/src/main.ts');
  const page = lire('../../app/index.html');
  const sorties = page.slice(page.indexOf('id="sorties"'), page.indexOf('</section>', page.indexOf('id="sorties"')));

  it('la note passe par noteDuCalcul et la note commune', () => {
    expect(main).toContain('noteDuCalcul(');
    expect(main).toMatch(/import \{[^}]*\bnoteDeCalculHtml\b[^}]*\} from 'aedificium-ui'/);
    expect(main).not.toMatch(/import \{[^}]*\bnoteDeCalculHtml\b[^}]*\} from '\.\/export'/);
  });

  it('le resultat garde les effets saisis', () => {
    expect(main).toMatch(/effets: lecture\.effets/);
  });

  it('champs projet et element dans les sorties, memorises', () => {
    expect(sorties).toContain('data-role="projet"');
    expect(sorties).toContain('data-role="element"');
    expect(main).toContain("'combinaisons-actions:cartouche'");
  });

  it('l ancienne note locale a disparu', () => {
    const exp = lire('../../app/src/export.ts');
    expect(exp).not.toContain('function noteDeCalculHtml');
    expect(exp).not.toContain('HYPOTHESES');
    expect(exp).not.toContain('function optionsEnTexte');
    expect(exp).toContain('export function combinaisonsEnCsv');
  });
});
