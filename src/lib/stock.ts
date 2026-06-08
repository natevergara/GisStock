import type { CsvRow } from '../types';
import { parseDescricao } from './parseDescricao';

// Orden físico de tallas, de menor a mayor. Las plus (G1..G3) van después de
// GG. Tallas fuera de esta lista se ordenan alfabéticamente al final.
export const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2', 'G3', 'XG', 'XGG', 'U', 'ÚNICO'];

export function parseStock(value: string | undefined): number {
  const parsed = Number(String(value ?? '0').replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a.toUpperCase());
    const bi = SIZE_ORDER.indexOf(b.toUpperCase());

    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;

    return a.localeCompare(b, 'pt-BR');
  });
}

export interface StockSummary {
  colors: { color: string; cells: Record<string, number> }[];
  sizes: string[];
  total: number;
}

/**
 * Agrupa las variaciones de un producto por color × talla, sumando el estoque
 * actual de cada celda. Mismo criterio de parseo y orden que la matriz en
 * pantalla (StockMatrix), para que el resumen coincida con lo que ve el usuario.
 */
export function buildStockSummary(
  childCodes: string[],
  rows: CsvRow[],
  indexByCode: Map<string, number>
): StockSummary {
  const byColor = new Map<string, Record<string, number>>();
  const sizeSet = new Set<string>();
  let total = 0;

  for (const childCode of childCodes) {
    const idx = indexByCode.get(childCode);
    if (idx === undefined) continue;

    const row = rows[idx];
    const parsed = parseDescricao(row['Descrição'] ?? '');
    const color = parsed.cor || 'Sem cor';
    const size = parsed.tamanho || 'ÚNICO';
    const stock = parseStock(row['Estoque']);

    sizeSet.add(size);
    let cells = byColor.get(color);
    if (!cells) {
      cells = {};
      byColor.set(color, cells);
    }
    cells[size] = (cells[size] ?? 0) + stock;
    total += stock;
  }

  const colors = Array.from(byColor.entries())
    .map(([color, cells]) => ({ color, cells }))
    .sort((a, b) => a.color.localeCompare(b.color, 'pt-BR', { numeric: true }));

  return { colors, sizes: sortSizes(Array.from(sizeSet)), total };
}
