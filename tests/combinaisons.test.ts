import { describe, expect, it } from 'vitest';
import {
  OPTIONS_PAR_DEFAUT,
  combinerEffets,
  en1990Recommande,
  enveloppes,
  formuleLisible,
  genererCombinaisons,
  type Action,
  type Combinaison,
  type Famille,
  type Options,
} from '../src/index';

/**
 * Combinaisons de l'EN 1990:2002, annexe A1, valeurs recommandees.
 * Coefficients attendus calcules a la main et ecrits en dur.
 */

const P = en1990Recommande();

const G: Action = { id: 'G', nom: 'poids propre', nature: 'permanente', peutEtreFavorable: false };
const Q: Action = { id: 'Q', nom: 'bureaux', nature: 'variable', categorie: 'B' };
const W: Action = { id: 'W', nom: 'vent', nature: 'variable', categorie: 'vent' };

function options(o: Partial<Options> = {}): Options {
  return { ...OPTIONS_PAR_DEFAUT, ...o };
}

/** Coefficients d'une combinaison, sous forme { action: coefficient } arrondie au millieme. */
function coefs(c: Combinaison): Record<string, number> {
  return Object.fromEntries(c.termes.map((t) => [t.action, Math.round(t.coefficient * 1000) / 1000]));
}

function famille(liste: Combinaison[], f: Famille): Array<Record<string, number>> {
  return liste.filter((c) => c.famille === f).map(coefs);
}

describe('ELU STR/GEO, expression (6.10)', () => {
  const liste = genererCombinaisons([G, Q, W], options({ equ: false, els: false }), P);

  it('chaque variable domine tour a tour, les autres a gamma_Q psi_0', () => {
    // Q domine : 1,35 G + 1,5 Q + 1,5 × 0,6 W = 0,9 W.
    // W domine : 1,35 G + 1,5 W + 1,5 × 0,7 Q = 1,05 Q.
    expect(famille(liste, 'ELU-STR')).toEqual([
      { G: 1.35, Q: 1.5, W: 0.9 },
      { G: 1.35, Q: 1.05, W: 1.5 },
    ]);
  });

  it('numerote dans la famille et nomme la dominante', () => {
    expect(liste.map((c) => [c.numero, c.dominante, c.expression])).toEqual([
      [1, 'Q', '6.10'],
      [2, 'W', '6.10'],
    ]);
  });

  it('une permanente pouvant etre favorable double les combinaisons, avec gamma_G,inf = 1,0', () => {
    const avec = genererCombinaisons([{ ...G, peutEtreFavorable: true } as Action, Q, W], options({ equ: false, els: false }), P);
    expect(famille(avec, 'ELU-STR')).toEqual([
      { G: 1.35, Q: 1.5, W: 0.9 },
      { G: 1.35, Q: 1.05, W: 1.5 },
      { G: 1, Q: 1.5, W: 0.9 },
      { G: 1, Q: 1.05, W: 1.5 },
    ]);
  });
});

describe('ELU STR/GEO, expressions (6.10a) et (6.10b)', () => {
  it('6.10a : toutes les variables a psi_0 ; 6.10b : xi gamma_G,sup = 0,85 × 1,35 = 1,1475', () => {
    const liste = genererCombinaisons([G, Q, W], options({ formule: '6.10ab', equ: false, els: false }), P);
    expect(liste.map((c) => c.expression)).toEqual(['6.10a', '6.10b', '6.10b']);
    expect(famille(liste, 'ELU-STR')).toEqual([
      { G: 1.35, Q: 1.05, W: 0.9 },
      { G: 1.148, Q: 1.5, W: 0.9 },
      { G: 1.148, Q: 1.05, W: 1.5 },
    ]);
  });
});

describe('ELU EQU et GEO', () => {
  it('EQU, jeu A : gamma_G,sup = 1,10, gamma_G,inf = 0,90, gamma_Q = 1,5', () => {
    const liste = genererCombinaisons([{ ...G, peutEtreFavorable: true } as Action, Q], options({ els: false }), P);
    expect(famille(liste, 'ELU-EQU')).toEqual([
      { G: 1.1, Q: 1.5 },
      { G: 0.9, Q: 1.5 },
    ]);
  });

  it('GEO, jeu C : gamma_G = 1,0, gamma_Q = 1,3', () => {
    const liste = genererCombinaisons([G, Q], options({ equ: false, els: false, geoC: true }), P);
    expect(famille(liste, 'ELU-GEO')).toEqual([{ G: 1, Q: 1.3 }]);
  });
});

describe('ELS', () => {
  const liste = genererCombinaisons([G, Q, W], options({ equ: false }), P);

  it('caracteristique (6.14b) : dominante a 1,0, les autres a psi_0', () => {
    expect(famille(liste, 'ELS-CAR')).toEqual([
      { G: 1, Q: 1, W: 0.6 },
      { G: 1, Q: 0.7, W: 1 },
    ]);
  });

  it('frequente (6.15b) : dominante a psi_1, les autres a psi_2 ; un psi nul retire le terme', () => {
    // Q domine : psi_1 = 0,5 ; W a psi_2 = 0 disparait.
    // W domine : psi_1 = 0,2 ; Q a psi_2 = 0,3.
    expect(famille(liste, 'ELS-FREQ')).toEqual([
      { G: 1, Q: 0.5 },
      { G: 1, Q: 0.3, W: 0.2 },
    ]);
  });

  it('quasi permanente (6.16b) : toutes a psi_2, une seule combinaison', () => {
    expect(famille(liste, 'ELS-QP')).toEqual([{ G: 1, Q: 0.3 }]);
  });
});

describe('accidentelle (6.11b)', () => {
  const A: Action = { id: 'A', nom: 'choc', nature: 'accidentelle' };

  it('G + A_d + psi_1 Q_1 + psi_2 Q_i, chaque variable dominant tour a tour', () => {
    const liste = genererCombinaisons([G, Q, W, A], options({ equ: false, els: false, accidentelle: true }), P);
    // Q domine : 0,5 Q ; W a psi_2 = 0. W domine : 0,2 W + 0,3 Q.
    expect(famille(liste, 'ELU-ACC')).toEqual([
      { G: 1, A: 1, Q: 0.5 },
      { G: 1, A: 1, Q: 0.3, W: 0.2 },
    ]);
  });

  it('avec psi_2 pour la dominante : la combinaison W dominante rejoint la QP', () => {
    const liste = genererCombinaisons([G, Q, W, A], options({ equ: false, els: false, accidentelle: true, psiAccidentelle: 'psi2' }), P);
    expect(famille(liste, 'ELU-ACC')).toEqual([{ G: 1, A: 1, Q: 0.3 }]);
  });

  it('refuse les accidentelles sans action accidentelle', () => {
    expect(() => genererCombinaisons([G, Q], options({ accidentelle: true }), P)).toThrow(/aucune action accidentelle/);
  });
});

describe('groupes d exclusion et regle des toits', () => {
  it('deux cas de vent du meme groupe ne sont jamais ensemble', () => {
    const W1: Action = { id: 'W1', nom: 'vent 0', nature: 'variable', categorie: 'vent', groupe: 'vent' };
    const W2: Action = { id: 'W2', nom: 'vent 90', nature: 'variable', categorie: 'vent', groupe: 'vent' };
    const liste = genererCombinaisons([G, W1, W2], options({ equ: false, els: false }), P);
    expect(famille(liste, 'ELU-STR')).toEqual([
      { G: 1.35, W1: 1.5 },
      { G: 1.35, W2: 1.5 },
    ]);
  });

  it('A1.2.1(3) : la charge de toit H ne se combine ni avec la neige ni avec le vent', () => {
    const H: Action = { id: 'H', nom: 'toit', nature: 'variable', categorie: 'H' };
    const S: Action = { id: 'S', nom: 'neige', nature: 'variable', categorie: 'neige' };
    const liste = genererCombinaisons([G, H, S], options({ equ: false, els: false }), P);
    // H domine : la neige disparait. S domine : H a psi_0 = 0 disparait.
    expect(famille(liste, 'ELU-STR')).toEqual([
      { G: 1.35, H: 1.5 },
      { G: 1.35, S: 1.5 },
    ]);
  });

  it('actions variables favorables : chaque groupe peut etre absent', () => {
    const liste = genererCombinaisons([G, Q], options({ equ: false, els: false, variablesFavorables: true }), P);
    expect(famille(liste, 'ELU-STR')).toEqual([{ G: 1.35 }, { G: 1.35, Q: 1.5 }]);
  });
});

describe('valeurs et enveloppes', () => {
  it('somme ponderee des effets, et enveloppe par famille', () => {
    // G : M = 10, Q : M = 5, W : M = -4.
    // 1 : 1,35 × 10 + 1,5 × 5 + 0,9 × (-4) = 17,4
    // 2 : 1,35 × 10 + 1,05 × 5 + 1,5 × (-4) = 12,75
    const liste = genererCombinaisons([G, Q, W], options({ equ: false, els: false }), P);
    const valeurs = combinerEffets(liste, { G: [10], Q: [5], W: [-4] }, 1);
    expect(valeurs.map((v) => Math.round((v.valeurs[0] as number) * 1000) / 1000)).toEqual([17.4, 12.75]);

    const env = enveloppes(valeurs, 1);
    expect(env[0].max[0]).toEqual({ valeur: 17.4, famille: 'ELU-STR', numero: 1 });
    expect(env[0].min[0]?.numero).toBe(2);
  });

  it('un effet manquant rend la valeur inconnue, pas nulle', () => {
    const liste = genererCombinaisons([G, Q], options({ equ: false, els: false }), P);
    expect(combinerEffets(liste, { G: [10], Q: [null] }, 1)[0].valeurs[0]).toBeNull();
  });
});

describe('controles', () => {
  it('formule lisible', () => {
    const [c] = genererCombinaisons([G, Q], options({ equ: false, els: false }), P);
    expect(formuleLisible(c, (id) => id)).toBe('1,35 G + 1,5 Q');
  });

  it('refuse un identifiant en double', () => {
    expect(() => genererCombinaisons([G, { ...Q, id: 'G' } as Action], options(), P)).toThrow(/double/);
  });

  it('refuse un profil dont une valeur n a pas de source', () => {
    const p = en1990Recommande();
    p.psi.B.psi0 = { valeur: 0.7, source: '' };
    expect(() => genererCombinaisons([G, Q], options(), p)).toThrow(/psi0 \(B\).*source/);
  });
});
