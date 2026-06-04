import { describe, it, expect } from 'vitest';
import { validateHeaders, validateRows } from './schema';
import type { CsvRow } from './types';

const REQUIRED = ['Código', 'Código Pai', 'Descrição', 'Estoque', 'URL Imagens Externas'];

function row(fields: Partial<CsvRow>): CsvRow {
  return {
    'Código': '',
    'Código Pai': '',
    'Descrição': '',
    'Estoque': '0',
    'URL Imagens Externas': '',
    ...fields,
  };
}

describe('validateHeaders', () => {
  it('todas las columnas presentes → ok', () => {
    expect(validateHeaders(REQUIRED)).toEqual({ ok: true });
  });

  it('columnas extra no son problema', () => {
    expect(validateHeaders([...REQUIRED, 'Preço', 'NCM'])).toEqual({ ok: true });
  });

  it('falta una columna → ok:false con la columna faltante', () => {
    const result = validateHeaders(REQUIRED.filter((c) => c !== 'Estoque'));
    expect(result).toEqual({ ok: false, missing: ['Estoque'] });
  });

  it('falta más de una columna → lista todas', () => {
    const result = validateHeaders(['Código']);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain('Código Pai');
      expect(result.missing).toContain('Descrição');
      expect(result.missing).toContain('Estoque');
      expect(result.missing).toContain('URL Imagens Externas');
    }
  });

  it('array vacío → falta todo', () => {
    const result = validateHeaders([]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toHaveLength(5);
  });
});

describe('validateRows', () => {
  const parent = row({ 'Código': 'PAI-01', 'Código Pai': '0' });
  const child1 = row({ 'Código': 'PAI-01-P', 'Código Pai': 'PAI-01' });
  const child2 = row({ 'Código': 'PAI-01-G', 'Código Pai': 'PAI-01' });

  it('caso feliz: 1 padre + hijos válidos → ok', () => {
    expect(validateRows([parent, child1, child2])).toEqual({ ok: true });
  });

  it('línea sin Código → error con número de línea', () => {
    const emptyCode = row({ 'Código': '' });
    const result = validateRows([parent, emptyCode, child1]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('3'); // fila 3 (índice 1, +2)
  });

  it('códigos duplicados → error listando los duplicados', () => {
    const dup = row({ 'Código': 'PAI-01-P', 'Código Pai': 'PAI-01' });
    const result = validateRows([parent, child1, dup]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('PAI-01-P');
  });

  it('ningún padre → error', () => {
    const result = validateRows([child1, child2]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/pai/i);
  });

  it('más de un padre → error', () => {
    const parent2 = row({ 'Código': 'PAI-02', 'Código Pai': '' });
    const result = validateRows([parent, child1, parent2]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/2 produtos pai/i);
  });

  it('padre sin variaciones → error', () => {
    const result = validateRows([parent]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/variações/i);
  });

  it('hijo con Código Pai distinto al padre → error de huérfano', () => {
    const orphan = row({ 'Código': 'OTRO-01', 'Código Pai': 'OTRO' });
    const result = validateRows([parent, child1, orphan]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('OTRO-01');
  });

  it('Código Pai = "0" también es padre válido', () => {
    const p = row({ 'Código': 'PAI-X', 'Código Pai': '0' });
    const c = row({ 'Código': 'PAI-X-M', 'Código Pai': 'PAI-X' });
    expect(validateRows([p, c])).toEqual({ ok: true });
  });
});
