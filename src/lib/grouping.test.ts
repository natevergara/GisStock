import { describe, it, expect } from 'vitest';
import { isParent, buildGroups, firstImageUrl } from './grouping';
import type { CsvRow } from '../types';

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

describe('isParent', () => {
  it('Código Pai vacío → padre', () => {
    expect(isParent(row({ 'Código Pai': '' }))).toBe(true);
  });

  it('Código Pai = "0" → padre', () => {
    expect(isParent(row({ 'Código Pai': '0' }))).toBe(true);
  });

  it('Código Pai con valor → hijo', () => {
    expect(isParent(row({ 'Código Pai': 'ABC-001' }))).toBe(false);
  });

  it('Código Pai con espacios alrededor de "0" → padre', () => {
    expect(isParent(row({ 'Código Pai': '  0  ' }))).toBe(true);
  });

  it('Código Pai con espacios alrededor de valor → hijo', () => {
    expect(isParent(row({ 'Código Pai': '  ABC-001  ' }))).toBe(false);
  });
});

describe('buildGroups', () => {
  const parent = row({ 'Código': 'PAI-01', 'Código Pai': '0', 'Descrição': 'Camiseta' });
  const child1 = row({ 'Código': 'PAI-01-P-Azul', 'Código Pai': 'PAI-01', 'Descrição': 'COR:Azul;TAMANHO:P' });
  const child2 = row({ 'Código': 'PAI-01-G-Preto', 'Código Pai': 'PAI-01', 'Descrição': 'COR:Preto;TAMANHO:G' });

  it('agrupa correctamente padre e hijos', () => {
    const groups = buildGroups([parent, child1, child2]);
    expect(groups).toHaveLength(1);
    expect(groups[0].parentCode).toBe('PAI-01');
    expect(groups[0].childCodes).toEqual(['PAI-01-P-Azul', 'PAI-01-G-Preto']);
  });

  it('preserva el orden original de los hijos', () => {
    const groups = buildGroups([parent, child2, child1]);
    expect(groups[0].childCodes).toEqual(['PAI-01-G-Preto', 'PAI-01-P-Azul']);
  });

  it('hijo huérfano no rompe — queda fuera del grupo', () => {
    const orphan = row({ 'Código': 'ORPHAN-01', 'Código Pai': 'INEXISTENTE' });
    const groups = buildGroups([parent, child1, orphan]);
    expect(groups).toHaveLength(1);
    expect(groups[0].childCodes).toEqual(['PAI-01-P-Azul']);
  });

  it('padre sin Código se ignora', () => {
    const badParent = row({ 'Código': '', 'Código Pai': '0' });
    const groups = buildGroups([badParent, child1]);
    expect(groups).toHaveLength(0);
  });

  it('devuelve array vacío si no hay padres', () => {
    expect(buildGroups([child1, child2])).toHaveLength(0);
  });

  it('múltiples padres generan múltiples grupos', () => {
    const parent2 = row({ 'Código': 'PAI-02', 'Código Pai': '' });
    const child3 = row({ 'Código': 'PAI-02-M', 'Código Pai': 'PAI-02' });
    const groups = buildGroups([parent, child1, parent2, child3]);
    expect(groups).toHaveLength(2);
  });
});

describe('firstImageUrl', () => {
  it('retorna la primera URL de un campo con múltiples URLs separadas por |', () => {
    const r = row({ 'URL Imagens Externas': 'https://a.com/img1.jpg|https://b.com/img2.jpg' });
    expect(firstImageUrl(r)).toBe('https://a.com/img1.jpg');
  });

  it('retorna la URL si hay solo una', () => {
    const r = row({ 'URL Imagens Externas': 'https://a.com/img.jpg' });
    expect(firstImageUrl(r)).toBe('https://a.com/img.jpg');
  });

  it('hace trim de espacios alrededor de la URL', () => {
    const r = row({ 'URL Imagens Externas': '  https://a.com/img.jpg  |https://b.com/img2.jpg' });
    expect(firstImageUrl(r)).toBe('https://a.com/img.jpg');
  });

  it('campo vacío → null', () => {
    const r = row({ 'URL Imagens Externas': '' });
    expect(firstImageUrl(r)).toBeNull();
  });

  it('campo ausente → null', () => {
    const r: CsvRow = { 'Código': 'X', 'Código Pai': '', 'Descrição': '', 'Estoque': '0' };
    expect(firstImageUrl(r)).toBeNull();
  });

  it('URL con solo espacios → null', () => {
    const r = row({ 'URL Imagens Externas': '   ' });
    expect(firstImageUrl(r)).toBeNull();
  });
});
