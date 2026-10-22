import { describe, expect, it } from 'vitest';
import { actionsClimatiques } from '../src/index';

function document(neige: unknown, vent: unknown): string {
  return JSON.stringify({ format: 'charges-climatiques/1', unites: {}, profil: { nom: 'p', date: 'd' }, neige, vent });
}

describe('import du document de charges-climatiques', () => {
  it('un cas de neige ou de vent par action, groupes d exclusion neige et vent', () => {
    const r = actionsClimatiques(
      document({ cas: [{ nom: 'Cas (i)' }, { nom: 'Cas (ii)' }] }, { cas: [{ libelle: 'Vent a 0°' }, { libelle: 'Vent a 90°' }] }),
      'neige'
    );
    expect(r.actions.map((a) => [a.id, a.nom, a.categorie, a.groupe])).toEqual([
      ['S1', 'Neige — Cas (i)', 'neige', 'neige'],
      ['S2', 'Neige — Cas (ii)', 'neige', 'neige'],
      ['W1', 'Vent — Vent a 0°', 'vent', 'vent'],
      ['W2', 'Vent — Vent a 90°', 'vent', 'vent'],
    ]);
    expect(r.ignores).toEqual([]);
  });

  it('un calcul absent est signale, pas tu', () => {
    const r = actionsClimatiques(document({ nonCalcule: 's_k absente' }, { cas: [] }), 'neige-haute');
    expect(r.ignores).toEqual(['Neige non calculee : s_k absente']);
  });

  it('refuse un autre format', () => {
    expect(() => actionsClimatiques(JSON.stringify({ format: 'autre/1' }), 'neige')).toThrow(/format/);
    expect(() => actionsClimatiques('{ pas du json', 'neige')).toThrow(/JSON/);
  });
});
