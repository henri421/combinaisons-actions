import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JETONS, valeursDesJetons } from 'aedificium-ui';
import { combinerEffets, en1990Recommande, enveloppes, genererCombinaisons, OPTIONS_PAR_DEFAUT } from '../../src/index';
import { lireModele, relire, saisieParDefaut, serialiser } from '../../app/src/modele';
import { lignesDuTableau, rendreResultats, type Resultat } from '../../app/src/vue';
import { combinaisonsEnCsv, noteDeCalculHtml } from '../../app/src/export';

const P = en1990Recommande();

function resultat(): Resultat {
  const s = saisieParDefaut();
  s.nomsEffets = 'M';
  s.actions[0].effets = ['10'];
  s.actions[1].effets = ['5'];
  s.actions[2].effets = ['3'];
  s.actions[3].effets = ['-4'];
  const l = lireModele(s);
  if (!l.ok) throw new Error(l.message);
  const combinaisons = genererCombinaisons(l.actions, l.options, P);
  const valeurs = combinerEffets(combinaisons, l.effets, 1);
  return { actions: l.actions, nomsEffets: l.nomsEffets, valeurs, enveloppes: enveloppes(valeurs, 1) };
}

describe('saisie', () => {
  it('l exemple de depart se lit, avec quatre actions', () => {
    const l = lireModele(saisieParDefaut());
    expect(l.ok && l.actions.map((a) => a.id)).toEqual(['G', 'Q', 'S', 'W']);
  });

  it('un effet illisible est refuse en nommant l action et l effet', () => {
    const s = saisieParDefaut();
    s.nomsEffets = 'N ; M';
    s.actions[1].effets = ['', 'abc'];
    const l = lireModele(s);
    expect(l.ok).toBe(false);
    expect(!l.ok && l.message).toMatch(/Action Q, effet M/);
  });

  it('enregistrer puis relire rend la meme saisie', () => {
    const s = saisieParDefaut();
    s.options = { ...OPTIONS_PAR_DEFAUT, formule: '6.10ab' };
    expect(relire(serialiser(s))).toEqual(s);
  });
});

describe('sorties', () => {
  it('la note porte exactement les tableaux de l ecran', () => {
    const r = resultat();
    const note = noteDeCalculHtml(r, P, OPTIONS_PAR_DEFAUT, 'Essai', '2026-10-23');
    expect(note).toContain(rendreResultats(r));
  });

  it('le tableau a une ligne par combinaison, une colonne par action, puis les effets', () => {
    const r = resultat();
    const lignes = lignesDuTableau(r);
    expect(lignes[0]).toEqual(['Famille', 'N°', 'Expression', 'Dominante', 'Combinaison', 'G', 'Q', 'S', 'W', 'M']);
    expect(lignes).toHaveLength(1 + r.valeurs.length);
    // ELU STR n° 1, Q dominante : 1,35 × 10 + 1,5 × 5 + 0,75 × 3 + 0,9 × (-4) = 19,65.
    const str1 = lignes.find((l) => String(l[0]).startsWith('ELU STR') && l[1] === 1);
    expect(Math.round((str1?.[9] as number) * 1000) / 1000).toBe(19.65);
  });

  it('le CSV est au format tableur francais : virgule decimale, point-virgule', () => {
    expect(combinaisonsEnCsv(resultat())).toMatch(/;19,65;?/);
  });

  it('le :root de style.css concorde avec les jetons communs', () => {
    const css = readFileSync(fileURLToPath(new URL('../../app/src/style.css', import.meta.url)), 'utf8');
    const page = valeursDesJetons(css);
    for (const [nom, valeur] of valeursDesJetons(JETONS)) expect(page.get(nom)).toBe(valeur);
  });
});
