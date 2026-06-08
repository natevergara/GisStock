import type { CsvMeta, CsvRow, StoredSession } from '../types';

const KEY_PREFIX = 'gisstock_session_';
const CSV_DATA_KEY = 'gisstock_csv_data';

export function sessionKey(parentCode: string): string {
  return `${KEY_PREFIX}${parentCode}`;
}

interface StoredCsv {
  meta: CsvMeta;
  rows: CsvRow[];
}

/**
 * Guarda el CSV cargado (filas + meta) para sobrevivir un refresh, cierre de
 * pestaña o update del PWA. Sin esto, el estado vive solo en memoria y el
 * usuario pierde el conteo en curso ante cualquier recarga.
 */
export function saveCsvData(rows: CsvRow[], meta: CsvMeta): void {
  try {
    localStorage.setItem(CSV_DATA_KEY, JSON.stringify({ meta, rows }));
  } catch (e) {
    // Cuota llena o modo privado. No bloqueamos al usuario; solo avisamos.
    console.warn('[storage] no se pudo guardar el CSV:', e);
  }
}

export function loadCsvData(): StoredCsv | null {
  try {
    const raw = localStorage.getItem(CSV_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCsv;
    if (!parsed?.meta || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCsvData(): void {
  localStorage.removeItem(CSV_DATA_KEY);
}

export function saveSession(s: StoredSession): void {
  try {
    localStorage.setItem(sessionKey(s.parentCode), JSON.stringify(s));
  } catch (e) {
    // Cuota llena o modo privado. No bloqueamos al usuario; solo avisamos.
    console.warn('[storage] no se pudo guardar la sesión:', e);
  }
}

export function loadSession(parentCode: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(parentCode));
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function loadAllSessions(): StoredSession[] {
  const out: StoredSession[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(k);
      if (raw) out.push(JSON.parse(raw) as StoredSession);
    } catch {
      // Sesión corrupta: la ignoramos en vez de romper la restauración.
    }
  }
  return out;
}

export function clearSession(parentCode: string): void {
  localStorage.removeItem(sessionKey(parentCode));
}

/**
 * Al cargar un nuevo CSV, limpiamos TODAS las sesiones anteriores.
 * Decisión explícita (PRD respuesta #2): evitar que datos viejos
 * contaminen el trabajo con un archivo recién exportado del ERP.
 */
export function clearAllSessions(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

