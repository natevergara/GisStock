import { describe, it, expect } from 'vitest';
import { exportCsv, buildExportFilename } from './csv';
import type { CsvMeta, CsvRow } from '../types';

const META: CsvMeta = {
  fields: ['Código', 'Código Pai', 'Descrição', 'Estoque', 'URL Imagens Externas'],
};

function row(fields: Partial<CsvRow>): CsvRow {
  return {
    'Código': '',
    'Código Pai': '0',
    'Descrição': '',
    'Estoque': '0',
    'URL Imagens Externas': '',
    ...fields,
  };
}

async function blobToText(blob: Blob): Promise<string> {
  return Buffer.from(await blob.arrayBuffer()).toString('utf-8');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ';' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsvLines(text: string): string[][] {
  const clean = text.startsWith('﻿') ? text.slice(1) : text;
  return clean
    .split('\r\n')
    .filter((l) => l.length > 0)
    .map(parseCsvLine);
}

describe('exportCsv', () => {
  it('incluye BOM UTF-8 al inicio', async () => {
    const blob = exportCsv([row({ 'Código': 'A' })], META);
    const text = await blobToText(blob);
    expect(text.charCodeAt(0)).toBe(0xFEFF);
  });

  it('usa CRLF como salto de línea', async () => {
    const blob = exportCsv([row({ 'Código': 'A' })], META);
    const text = await blobToText(blob);
    const withoutBOM = text.slice(1);
    expect(withoutBOM).toContain('\r\n');
    expect(withoutBOM).not.toMatch(/(?<!\r)\n/);
  });

  it('preserva el orden y nombres de columnas de meta.fields', async () => {
    const blob = exportCsv([row({ 'Código': 'X' })], META);
    const text = await blobToText(blob);
    const [header] = parseCsvLines(text);
    expect(header).toEqual(META.fields);
  });

  it('fila sucia: Estoque entero → formato Bling "N,00"', async () => {
    const rows = [row({ 'Código': 'C1', 'Código Pai': '0', 'Estoque': '8' })];
    const dirty = new Set(['C1']);
    const blob = exportCsv(rows, META, dirty);
    const lines = parseCsvLines(await blobToText(blob));
    const estoqueIdx = META.fields.indexOf('Estoque');
    expect(lines[1][estoqueIdx]).toBe('8,00');
  });

  it('fila sucia: "16,99" → "16,00" (trunca, no redondea)', async () => {
    const rows = [row({ 'Código': 'C1', 'Estoque': '16,99' })];
    const dirty = new Set(['C1']);
    const blob = exportCsv(rows, META, dirty);
    const lines = parseCsvLines(await blobToText(blob));
    const estoqueIdx = META.fields.indexOf('Estoque');
    expect(lines[1][estoqueIdx]).toBe('16,00');
  });

  it('fila sucia: Estoque vacío → "0,00"', async () => {
    const rows = [row({ 'Código': 'C1', 'Estoque': '' })];
    const dirty = new Set(['C1']);
    const blob = exportCsv(rows, META, dirty);
    const lines = parseCsvLines(await blobToText(blob));
    const estoqueIdx = META.fields.indexOf('Estoque');
    expect(lines[1][estoqueIdx]).toBe('0,00');
  });

  it('fila sucia: Estoque negativo → "0,00"', async () => {
    const rows = [row({ 'Código': 'C1', 'Estoque': '-5' })];
    const dirty = new Set(['C1']);
    const blob = exportCsv(rows, META, dirty);
    const lines = parseCsvLines(await blobToText(blob));
    const estoqueIdx = META.fields.indexOf('Estoque');
    expect(lines[1][estoqueIdx]).toBe('0,00');
  });

  it('fila sucia: "0" → "0,00"', async () => {
    const rows = [row({ 'Código': 'C1', 'Estoque': '0' })];
    const dirty = new Set(['C1']);
    const blob = exportCsv(rows, META, dirty);
    const lines = parseCsvLines(await blobToText(blob));
    const estoqueIdx = META.fields.indexOf('Estoque');
    expect(lines[1][estoqueIdx]).toBe('0,00');
  });

  it('fila NO sucia: valor de Estoque se preserva sin reformatear', async () => {
    const rows = [row({ 'Código': 'C1', 'Estoque': '33' })];
    const dirty = new Set<string>(); // ninguna fila sucia
    const blob = exportCsv(rows, META, dirty);
    const lines = parseCsvLines(await blobToText(blob));
    const estoqueIdx = META.fields.indexOf('Estoque');
    expect(lines[1][estoqueIdx]).toBe('33'); // valor original preservado
  });

  it('solo modifica Estoque — el resto de columnas queda intacto en filas sucias', async () => {
    const r = row({
      'Código': 'C1',
      'Código Pai': 'PAI',
      'Descrição': 'COR:Azul;TAMANHO:G',
      'Estoque': '5',
      'URL Imagens Externas': 'https://img.com/foto.jpg',
    });
    const dirty = new Set(['C1']);
    const blob = exportCsv([r], META, dirty);
    const lines = parseCsvLines(await blobToText(blob));
    const [header, dataLine] = lines;

    const get = (col: string) => dataLine[header.indexOf(col)];
    expect(get('Código')).toBe('C1');
    expect(get('Código Pai')).toBe('PAI');
    expect(get('Descrição')).toBe('COR:Azul;TAMANHO:G');
    expect(get('URL Imagens Externas')).toBe('https://img.com/foto.jpg');
    expect(get('Estoque')).toBe('5,00'); // único campo modificado
  });

  it('sin dirtyCodes (undefined): reformatea todas las filas', async () => {
    const rows = [
      row({ 'Código': 'C1', 'Estoque': '10' }),
      row({ 'Código': 'C2', 'Estoque': '20' }),
    ];
    const blob = exportCsv(rows, META); // sin dirtyCodes
    const lines = parseCsvLines(await blobToText(blob));
    const estoqueIdx = META.fields.indexOf('Estoque');
    expect(lines[1][estoqueIdx]).toBe('10,00');
    expect(lines[2][estoqueIdx]).toBe('20,00');
  });
});

describe('buildExportFilename', () => {
  it('tiene el formato correcto con timestamp', () => {
    const name = buildExportFilename();
    expect(name).toMatch(/^gisstock_estoque_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.csv$/);
  });
});
