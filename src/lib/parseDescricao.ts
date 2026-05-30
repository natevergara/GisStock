import type { ParsedDescricao } from '../types';

/**
 * Parser del campo Descrição de hijos, según PRD §3B:
 *   Input:  "COR:Amarelo manteiga;TAMANHO:G"
 *   Output: { cor: "Amarelo manteiga", tamanho: "G", other: [], raw: "..." }
 *
 * Tolerante a:
 * - Mayúsculas/minúsculas en las claves (COR, cor, Cor)
 * - Espacios alrededor de ":" y ";"
 * - Claves desconocidas → van a `other`
 * - Descripciones de padre (que son texto libre, no clave:valor) → cor/tamanho quedan undefined
 */
export function parseDescricao(raw: string): ParsedDescricao {
  const result: ParsedDescricao = { other: [], raw };
  if (!raw) return result;

  // Si no contiene ":", es descripción de padre (texto libre). Dejamos raw y salimos.
  if (!raw.includes(':')) return result;

  const pairs = raw.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf(':');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim().toUpperCase();
    const value = pair.slice(idx + 1).trim();
    if (!value) continue;

    switch (key) {
      case 'COR':
        result.cor = value;
        break;
      case 'TAMANHO':
      case 'TAMANHO/SIZE':
      case 'SIZE':
        result.tamanho = value;
        break;
      default:
        result.other.push({ key, value });
    }
  }

  return result;
}

/**
 * Formato de display para mostrar en la UI:
 *   "Color: Amarelo manteiga | Talla: G"
 */
export function formatParsedDescricao(p: ParsedDescricao): string {
  const parts: string[] = [];
  if (p.cor) parts.push(`Cor: ${p.cor}`);
  if (p.tamanho) parts.push(`Tamanho: ${p.tamanho}`);
  for (const o of p.other) parts.push(`${o.key}: ${o.value}`);
  return parts.join(' | ') || p.raw;
}
