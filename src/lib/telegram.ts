import type { StockSummary } from './stock';

export const WORKER_URL = 'https://crimson-dream-a84d.natev.workers.dev';
export const USER_KEY = 'gisstock_usuario';
const LABEL_MAX = 12;

export function getSavedUser(): string {
  return localStorage.getItem(USER_KEY) ?? '';
}

export function saveUser(name: string): void {
  localStorage.setItem(USER_KEY, name.trim());
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function renderTable(summary: StockSummary): string {
  const labels = summary.colors.map((c) => truncate(c.color, LABEL_MAX));
  const labelW = labels.reduce((w, l) => Math.max(w, l.length), 0);
  const cellText = (value: number | undefined) => (value === undefined ? '-' : String(value));
  const colW = summary.sizes.map((sz) =>
    summary.colors.reduce((w, c) => Math.max(w, cellText(c.cells[sz]).length), sz.length)
  );
  const header =
    ''.padEnd(labelW) + summary.sizes.map((sz, i) => `  ${sz.padStart(colW[i])}`).join('');
  const body = summary.colors.map((c, r) => {
    const cells = summary.sizes
      .map((sz, i) => `  ${cellText(c.cells[sz]).padStart(colW[i])}`)
      .join('');
    return labels[r].padEnd(labelW) + cells;
  });
  return [header, ...body].join('\n');
}

function horaAtual(): string {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface GroupMessageOpts {
  usuario: string;
  codigo: string;
  descricao: string;
  summary: StockSummary;
  counted: number;
  totalVars: number;
  otherProducts: number;
}

/** Mensaje completo con tabla cor×talla — para notificar al grupo. */
export function buildGroupMessage(opts: GroupMessageOpts): string {
  const lines = [
    `📦 <b>GisStock — Notificação</b>`,
    `👤 ${escapeHtml(opts.usuario)} · ${horaAtual()}`,
    `📋 ${escapeHtml(opts.codigo)} — ${escapeHtml(truncate(opts.descricao, 40))}`,
    `📦 ${opts.summary.total} un · ${opts.counted} de ${opts.totalVars} contadas`,
    ``,
    `<pre>${escapeHtml(renderTable(opts.summary))}</pre>`,
  ];
  if (opts.otherProducts > 0) {
    lines.push(`⚠️ +${opts.otherProducts} outro(s) produto(s) também alterado(s)`);
  }
  return lines.join('\n');
}

export interface PrivateMessageOpts {
  usuario: string;
  codigo: string;
  descricao: string;
  counted: number;
  totalVars: number;
}

/** Mensaje corto — aviso privado al exportar (sin tabla). */
export function buildPrivateMessage(opts: PrivateMessageOpts): string {
  return [
    `✅ <b>GisStock — Exportação</b>`,
    `👤 ${escapeHtml(opts.usuario)} · ${horaAtual()}`,
    `📋 ${escapeHtml(opts.codigo)} — ${escapeHtml(truncate(opts.descricao, 40))}`,
    `🔢 ${opts.counted} de ${opts.totalVars} variações contadas`,
  ].join('\n');
}

/**
 * Envía texto al Worker de Cloudflare, que lo reenvía a Telegram.
 * Async — devuelve true si el Worker respondió ok.
 * Para Export (fire-and-forget) no se necesita await; para Notificar sí.
 */
export async function notifyWorker(text: string, target: 'private' | 'group'): Promise<boolean> {
  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
