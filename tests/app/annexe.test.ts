/**
 * Tests d'acceptation du lot E (audit R4) : annexe nationale luxembourgeoise,
 * coefficients prerempli et modifiables, sources, avertissement, enregistrement.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { constatsAffichage, definirLangue, noteDeCalculHtml, texteVisible } from 'aedificium-ui';
import { combinerEffets, en1990Recommande, enveloppes, genererCombinaisons, verifierProfil } from '../../src/index';
import type { Resultat } from '../../app/src/vue';
import { coefficientsEnChaines, profilDeCalcul, profilDeLAnnexe, profilLu } from '../../app/src/annexe';
import { lireModele, relire, saisieParDefaut, serialiser } from '../../app/src/modele';
import { noteDuCalcul } from '../../app/src/note';

const CARTOUCHE = { projet: 'Halle', element: 'Portique P2', date: '2026-11-18' };
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');

/** Resultat calcule avec une annexe donnee, valeurs modifiees optionnelles. */
function resultat(annexe: 'recommande' | 'lu', modifier: Record<string, string> = {}) {
  const s = saisieParDefaut();
  s.annexe = annexe;
  s.coefficients = { ...coefficientsEnChaines(annexe), ...modifier };
  const l = lireModele(s);
  if (!l.ok) throw new Error(l.message);
  const n = l.nomsEffets.length;
  const valeurs = combinerEffets(genererCombinaisons(l.actions, l.options, l.profil), l.effets, n);
  const r: Resultat = { actions: l.actions, nomsEffets: l.nomsEffets, valeurs, enveloppes: enveloppes(valeurs, n), effets: l.effets };
  return { r, profil: l.profil, options: l.options };
}

describe('profil luxembourgeois', () => {
  it('nom mentionnant le Luxembourg, profil valide, chaque valeur sourcee AN-LU', () => {
    const lu = profilLu();
    expect(lu.nom).toMatch(/Luxembourg/);
    expect(() => verifierProfil(lu)).not.toThrow();
    const p = profilLu();
    expect(p.psi.C.psi1.source).toMatch(/^ILNAS-EN 1990\/AN-LU:2020, tableau A1\.1 : valeur recommandée présumée retenue/);
    expect(p.jeuB.gammaGSup.source).toMatch(/^ILNAS-EN 1990\/AN-LU:2020, tableau A1\.2\(B\) : valeur recommandée présumée retenue/);
    expect(p.xi.source).toMatch(/AN-LU:2020, tableau A1\.2\(B\), note 2/);
  });

  it('valeurs luxembourgeoises egales aux recommandees (pas d ecart connu), recommande inchange', () => {
    const rec = en1990Recommande();
    const lu = profilLu();
    expect(lu.jeuB.gammaGSup.valeur).toBe(rec.jeuB.gammaGSup.valeur);
    expect(lu.psi.A.psi0.valeur).toBe(rec.psi.A.psi0.valeur);
    expect(profilDeLAnnexe('recommande')).toEqual(rec);
    expect(profilDeCalcul('recommande', coefficientsEnChaines('recommande'))).toEqual(rec);
  });
});

describe('valeur modifiee par l utilisateur', () => {
  it('marquee imposee, les autres gardent leur source', () => {
    const c = { ...coefficientsEnChaines('lu'), 'gSup:A': '1,2' };
    const p = profilDeCalcul('lu', c);
    expect(p.jeuA.gammaGSup.valeur).toBe(1.2);
    expect(p.jeuA.gammaGSup.source).toMatch(/^valeur imposée par l’utilisateur \(ILNAS-EN 1990\/AN-LU:2020/);
    expect(p.jeuA.gammaGInf).toEqual(profilLu().jeuA.gammaGInf);
    expect(p.psi.A.psi0).toEqual(profilLu().psi.A.psi0);
  });

  it('une valeur non numerique est refusee en nommant le coefficient', () => {
    const c = { ...coefficientsEnChaines('lu'), xi: 'abc' };
    expect(() => profilDeCalcul('lu', c)).toThrow(/Réduction des permanentes.*nombre attendu/);
    const l = lireModele({ ...saisieParDefaut(), annexe: 'lu', coefficients: c });
    expect(l.ok).toBe(false);
  });
});

describe('saisie', () => {
  it('annexe et coefficients enregistres puis relus', () => {
    const s = saisieParDefaut();
    s.annexe = 'lu';
    s.coefficients = { ...coefficientsEnChaines('lu'), 'psi0:A': '0,6' };
    const relu = relire(serialiser(s));
    expect(relu).toEqual(s);
    expect(relu.annexe).toBe('lu');
    expect(relu.coefficients['psi0:A']).toBe('0,6');
  });

  it('un ancien fichier sans annexe ni coefficients se relit avec les valeurs recommandees', () => {
    const ancien = JSON.parse(serialiser(saisieParDefaut())) as Record<string, unknown>;
    delete ancien.annexe;
    delete ancien.coefficients;
    const relu = relire(JSON.stringify(ancien));
    expect(relu.annexe).toBe('recommande');
    expect(relu.coefficients).toEqual(coefficientsEnChaines('recommande'));
  });

  it('par defaut : valeurs recommandees, sans avertissement', () => {
    const l = lireModele(saisieParDefaut());
    if (!l.ok) throw new Error(l.message);
    expect(l.annexe).toBe('recommande');
    expect(l.profil).toEqual(en1990Recommande());
  });
});

describe('note de calcul', () => {

  it('annexe LU : norme AN-LU, avertissement en tete, coefficients et sources visibles', () => {
    const { r, profil, options } = resultat('lu');
    const note = noteDuCalcul(profil, r, options, CARTOUCHE, 'lu');
    expect(note.cartouche.norme).toBe('EN 1990:2002, annexe A1, ILNAS-EN 1990/AN-LU:2020');
    expect(note.avertissements?.[0]).toMatch(/^Annexe nationale luxembourgeoise/);
    const texte = texteVisible(noteDeCalculHtml(note));
    expect(texte).toContain('Luxembourg');
    expect(texte).toContain('ILNAS-EN 1990/AN-LU:2020, tableau A1.1');
    expect(texte).toContain('Réduction des permanentes');
    expect(texte).toContain('Coefficients : Luxembourg');
  });

  it('valeur imposee visible dans la note', () => {
    const { r, profil, options } = resultat('lu', { 'gSup:A': '1,2' });
    const texte = texteVisible(noteDeCalculHtml(noteDuCalcul(profil, r, options, CARTOUCHE, 'lu')));
    expect(texte).toContain('valeur imposée par l’utilisateur');
  });

  it('valeurs recommandees : norme, note et avertissement inchanges', () => {
    const { r, profil, options } = resultat('recommande');
    const note = noteDuCalcul(profil, r, options, CARTOUCHE);
    expect(note.cartouche.norme).toBe('EN 1990:2002, annexe A1');
    expect(note.avertissements).toEqual([]);
    expect(texteVisible(noteDeCalculHtml(note))).not.toContain('AN-LU');
  });

  it('en anglais : aucun reste de francais dans la note luxembourgeoise', () => {
    definirLangue('en');
    try {
      const { r, profil, options } = resultat('lu', { 'gSup:A': '1,2' });
      const html = noteDeCalculHtml(noteDuCalcul(profil, r, options, CARTOUCHE, 'lu'));
      expect(texteVisible(html)).toContain('Table A1.1');
      expect(texteVisible(html)).toContain('value imposed by the user');
      expect(constatsAffichage(texteVisible(html), { langue: 'en' })).toEqual([]);
    } finally {
      definirLangue('fr');
    }
  });
});

describe('pages', () => {
  it('francaise et anglaise : choix d annexe et bandeau masque', () => {
    for (const page of ['../../app/index.html', '../../app/en/index.html']) {
      const html = lire(page);
      expect(html).toContain('data-champ="annexe"');
      expect(html).toMatch(/<p class="avertissement" data-role="bandeau-annexe" hidden><\/p>/);
      expect(html).toContain('data-role="coefficients"');
    }
  });
});
