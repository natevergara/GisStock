import Papa from 'papaparse';
import type { CsvMeta, CsvRow } from '../types';

export interface ParseResult {
  rows: CsvRow[];
  meta: CsvMeta;
}

/**
 * Parser CSV.
 * Capturamos meta.fields dinámicamente para preservar el orden y nombre exacto
 * de las columnas que vinieron del ERP.
 */
export function parseCsv(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      delimiter: ';',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          reject(new Error('Arquivo ERP incompatível: nenhum cabeçalho detectado.'));
          return;
        }

        resolve({
          rows: results.data as CsvRow[],
          meta: { fields: results.meta.fields },
        });
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Export CSV compatible con Bling:
 * - Usa meta.fields para preservar columnas y orden
 * - Normaliza Estoque a formato "10,00" SOLO en las filas editadas (dirtyCodes).
 *   Las filas no tocadas quedan byte-idénticas al CSV original del ERP, evitando
 *   truncar/alterar valores que el usuario no modificó.
 * - Mantiene BOM UTF-8 y CRLF
 *
 * Si dirtyCodes es undefined, normaliza todas las filas (comportamiento legacy).
 */
export function exportCsv(rows: CsvRow[], meta: CsvMeta, dirtyCodes?: Set<string>): Blob {
  const exportRows = rows.map((row) => {
    if (dirtyCodes && !dirtyCodes.has((row['Código'] ?? '').trim())) {
      return row;
    }
    return { ...row, Estoque: formatStockForBling(row['Estoque']) };
  });

  const csv = Papa.unparse(
    {
      fields: meta.fields,
      data: exportRows,
    },
    {
      quotes: true,
      delimiter: ';',
      newline: '\r\n',
      header: true,
    }
  );

  const BOM = '\uFEFF';
  return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
}

function formatStockForBling(value: string | undefined): string {
  const raw = String(value ?? '').trim();

  if (raw === '') {
    return '0,00';
  }

  const normalized = raw.replace(',', '.');
  const number = Number(normalized);

  if (!Number.isFinite(number) || number < 0) {
    return '0,00';
  }

  return `${Math.floor(number)},00`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function buildExportFilename(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;

  return `gisstock_estoque_${ts}.csv`;
}
