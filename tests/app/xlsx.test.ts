import { describe, expect, it } from 'vitest';
import { classeurXlsx, colonne, crc32, zipSansCompression } from '../../app/src/xlsx';

describe('classeur xlsx sans dependance', () => {
  it('CRC-32 de la valeur de controle du format ZIP', () => {
    // Valeur de controle de reference : CRC-32 de « 123456789 » = CBF43926.
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('lettres de colonne', () => {
    expect([0, 25, 26, 27, 701, 702].map(colonne)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  });

  it('archive ZIP : signatures locale et de fin', () => {
    const z = zipSansCompression([{ nom: 'a.txt', contenu: 'abc' }]);
    expect([...z.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect([...z.slice(z.length - 22, z.length - 18)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it('le classeur contient ses feuilles, les textes echappes et les nombres en valeur', () => {
    const z = classeurXlsx([{ nom: 'ELU / ELS', lignes: [['Action', 'Coef'], ['G < 1', 1.35]] }]);
    const texte = new TextDecoder().decode(z);
    expect(texte).toContain('xl/worksheets/sheet1.xml');
    expect(texte).toContain('name="ELU   ELS"');
    expect(texte).toContain('G &lt; 1');
    expect(texte).toContain('<v>1.35</v>');
  });

  it('refuse un classeur vide', () => {
    expect(() => classeurXlsx([])).toThrow(/au moins une feuille/);
  });
});
