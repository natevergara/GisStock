import type { CsvRow, ParentGroup } from '../types';

/**
 * Identificación de jerarquía según PRD §3A:
 * - Producto Padre: Código Pai === "0" o está vacío
 * - Variación (Hijo): Código Pai === Código del padre
 */
export function isParent(row: CsvRow): boolean {
  const pai = (row['Código Pai'] ?? '').trim();
  return pai === '' || pai === '0';
}

export function buildGroups(rows: CsvRow[]): ParentGroup[] {
  const parents = new Map<string, ParentGroup>();
  const orphans: CsvRow[] = [];

  // Primera pasada: recoger padres
  for (const row of rows) {
    if (isParent(row)) {
      const code = (row['Código'] ?? '').trim();
      if (!code) continue;
      parents.set(code, {
        parentCode: code,
        parentRow: row,
        childCodes: [],
      });
    }
  }

  // Segunda pasada: asignar hijos a su padre
  for (const row of rows) {
    if (isParent(row)) continue;
    const parentCode = (row['Código Pai'] ?? '').trim();
    const childCode = (row['Código'] ?? '').trim();
    const group = parents.get(parentCode);
    if (group && childCode) {
      group.childCodes.push(childCode);
    } else {
      orphans.push(row);
    }
  }

  if (orphans.length > 0) {
    // Logueamos, no fallamos — un huérfano no debe impedir trabajar con el resto
    console.warn(`[grouping] ${orphans.length} filas sin padre identificable:`, orphans.map((r) => r['Código']));
  }

  return Array.from(parents.values());
}

/**
 * Devuelve la primera URL del campo "URL Imagens Externas" (split por "|").
 * Según PRD §3B.
 */
export function firstImageUrl(row: CsvRow): string | null {
  const raw = row['URL Imagens Externas'];
  if (!raw) return null;
  const first = raw.split('|')[0]?.trim();
  return first || null;
}
