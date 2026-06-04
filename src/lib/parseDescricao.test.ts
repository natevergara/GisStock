import { describe, it, expect } from 'vitest';
import { parseDescricao, formatParsedDescricao } from './parseDescricao';

describe('parseDescricao', () => {
  it('caso feliz: COR y TAMANHO en mayúsculas', () => {
    const r = parseDescricao('COR:Azul Escuro;TAMANHO:G');
    expect(r.cor).toBe('Azul Escuro');
    expect(r.tamanho).toBe('G');
    expect(r.other).toHaveLength(0);
  });

  it('claves en minúscula son toleradas', () => {
    const r = parseDescricao('cor:Vermelho;tamanho:M');
    expect(r.cor).toBe('Vermelho');
    expect(r.tamanho).toBe('M');
  });

  it('claves en mixedCase son toleradas', () => {
    const r = parseDescricao('Cor:Branco;Tamanho:PP');
    expect(r.cor).toBe('Branco');
    expect(r.tamanho).toBe('PP');
  });

  it('espacios alrededor de : y ;', () => {
    const r = parseDescricao('COR : Amarelo ; TAMANHO : GG');
    expect(r.cor).toBe('Amarelo');
    expect(r.tamanho).toBe('GG');
  });

  it('alias TAMANHO/SIZE', () => {
    const r = parseDescricao('COR:Preto;TAMANHO/SIZE:XG');
    expect(r.tamanho).toBe('XG');
  });

  it('alias SIZE', () => {
    const r = parseDescricao('COR:Verde;SIZE:P');
    expect(r.tamanho).toBe('P');
  });

  it('clave desconocida va a other', () => {
    const r = parseDescricao('COR:Azul;MATERIAL:Algodão;TAMANHO:M');
    expect(r.cor).toBe('Azul');
    expect(r.tamanho).toBe('M');
    expect(r.other).toEqual([{ key: 'MATERIAL', value: 'Algodão' }]);
  });

  it('descripción de padre (texto libre sin :) → cor y tamanho undefined', () => {
    const r = parseDescricao('Camiseta Básica Algodão');
    expect(r.cor).toBeUndefined();
    expect(r.tamanho).toBeUndefined();
    expect(r.raw).toBe('Camiseta Básica Algodão');
  });

  it('string vacío → objeto vacío sin error', () => {
    const r = parseDescricao('');
    expect(r.cor).toBeUndefined();
    expect(r.tamanho).toBeUndefined();
    expect(r.other).toHaveLength(0);
  });

  it('par con valor vacío se ignora', () => {
    const r = parseDescricao('COR:;TAMANHO:P');
    expect(r.cor).toBeUndefined();
    expect(r.tamanho).toBe('P');
  });

  it('preserva raw siempre', () => {
    const raw = 'COR:Azul;TAMANHO:G';
    expect(parseDescricao(raw).raw).toBe(raw);
  });
});

describe('formatParsedDescricao', () => {
  it('cor y tamanho → "Cor: X | Tamanho: Y"', () => {
    const p = parseDescricao('COR:Azul;TAMANHO:G');
    expect(formatParsedDescricao(p)).toBe('Cor: Azul | Tamanho: G');
  });

  it('solo cor', () => {
    const p = parseDescricao('COR:Preto');
    expect(formatParsedDescricao(p)).toBe('Cor: Preto');
  });

  it('con clave extra', () => {
    const p = parseDescricao('COR:Azul;MATERIAL:Algodão;TAMANHO:M');
    expect(formatParsedDescricao(p)).toBe('Cor: Azul | Tamanho: M | MATERIAL: Algodão');
  });

  it('descripción libre → fallback a raw', () => {
    const p = parseDescricao('Camiseta Básica');
    expect(formatParsedDescricao(p)).toBe('Camiseta Básica');
  });
});
