import { describe, it, expect } from 'vitest';
import { parseStock, sortSizes, buildStockSummary } from './stock';
import type { CsvRow } from '../types';

describe('parseStock', () => {
  it('parsea formato Bling con coma', () => {
    expect(parseStock('12,00')).toBe(12);
  });

  it('vacío, negativo e indefinido → 0', () => {
    expect(parseStock('')).toBe(0);
    expect(parseStock('-5')).toBe(0);
    expect(parseStock(undefined)).toBe(0);
  });
});

describe('sortSizes', () => {
  it('ordena de menor a mayor, con G1..G3 después de GG', () => {
    expect(sortSizes(['G1', 'M', 'GG', 'P', 'G3', 'G'])).toEqual([
      'P',
      'M',
      'G',
      'GG',
      'G1',
      'G3',
    ]);
  });

  it('tallas desconocidas van al final, alfabéticamente', () => {
    expect(sortSizes(['XYZ', 'M', 'ABC'])).toEqual(['M', 'ABC', 'XYZ']);
  });
});

describe('buildStockSummary', () => {
  // Datos reales del producto B004M (subconjunto).
  const rows: CsvRow[] = [
    { Código: 'C1', Descrição: 'COR:Azul Marinho;TAMANHO:G1', Estoque: '12,00' },
    { Código: 'C2', Descrição: 'COR:Azul Marinho;TAMANHO:GG', Estoque: '14,00' },
    { Código: 'C3', Descrição: 'COR:Branco;TAMANHO:G1', Estoque: '6,00' },
    { Código: 'C4', Descrição: 'COR:Branco;TAMANHO:GG', Estoque: '8,00' },
  ];
  const indexByCode = new Map(rows.map((r, i) => [r['Código'] as string, i]));

  it('agrupa por color, ordena tallas y suma el total', () => {
    const s = buildStockSummary(['C1', 'C2', 'C3', 'C4'], rows, indexByCode);

    expect(s.sizes).toEqual(['GG', 'G1']);
    expect(s.total).toBe(40);
    expect(s.colors.map((c) => c.color)).toEqual(['Azul Marinho', 'Branco']);
    expect(s.colors[0].cells).toEqual({ G1: 12, GG: 14 });
  });

  it('color o talla ausentes usan los valores por defecto', () => {
    const r: CsvRow[] = [{ Código: 'X', Descrição: 'texto livre sem padrão', Estoque: '5,00' }];
    const s = buildStockSummary(['X'], r, new Map([['X', 0]]));

    expect(s.colors[0].color).toBe('Sem cor');
    expect(s.sizes).toEqual(['ÚNICO']);
    expect(s.total).toBe(5);
  });
});
