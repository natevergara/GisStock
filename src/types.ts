// Row = una fila del CSV. Llaves son los nombres exactos de columna del CSV original.
// Valores siempre como string para preservar formato original (ej. "16,99", "10.0").
export type CsvRow = Record<string, string>;

export interface CsvMeta {
  // Orden y nombres EXACTOS de columnas según PapaParse results.meta.fields
  // Fuente de verdad para el re-export. NUNCA mutar.
  fields: string[];
}

export interface ParentGroup {
  parentCode: string;          // valor de "Código" del padre
  parentRow: CsvRow;           // fila padre completa
  childCodes: string[];        // "Código" de cada hijo, en orden original
}

export interface ParsedDescricao {
  cor?: string;
  tamanho?: string;
  other: Array<{ key: string; value: string }>;
  raw: string;
}

// Sesión persistida en localStorage por padre. Guardamos solo overrides
// del campo Estoque para evitar duplicar el CSV entero en storage.
export interface StoredSession {
  parentCode: string;
  savedAt: number;             // epoch ms
  // childCode -> valor de Estoque en string tal como se exportará
  estoqueOverrides: Record<string, string>;
  // Qué hijos han sido modificados desde que se cargó el CSV
  dirtyChildren: string[];
}
