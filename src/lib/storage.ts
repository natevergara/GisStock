import type { StoredSession } from '../types';

const KEY_PREFIX = 'gisstock_session_';

export function sessionKey(parentCode: string): string {
  return `${KEY_PREFIX}${parentCode}`;
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

