import { useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { buildExportFilename, downloadBlob, exportCsv } from '../lib/csv';
import { buildStockSummary, type StockSummary } from '../lib/stock';

const WORKER_URL = 'https://crimson-dream-a84d.natev.workers.dev';
const USER_KEY = 'gisstock_usuario';
const LABEL_MAX = 12;

function getSavedUser(): string {
  return localStorage.getItem(USER_KEY) ?? '';
}

function saveUser(name: string): void {
  localStorage.setItem(USER_KEY, name.trim());
}

function notifyWorker(text: string): void {
  // fire-and-forget: no bloqueamos la exportación si el Worker falla
  fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).catch(() => {});
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Tabla monoespaciada cor × talla, alineada por columnas. */
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

function buildMessage(opts: {
  usuario: string;
  codigo: string;
  descricao: string;
  summary: StockSummary;
  counted: number;
  totalVars: number;
  otherProducts: number;
}): string {
  const hora = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [
    `📦 <b>GisStock — Exportação</b>`,
    `👤 ${escapeHtml(opts.usuario)} · ${hora}`,
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

export function ExportButton() {
  const [busy, setBusy] = useState(false);
  const [askName, setAskName] = useState(false);
  const [inputName, setInputName] = useState('');

  const rows = useStockStore((s) => s.rows);
  const meta = useStockStore((s) => s.meta);
  const dirtyByParent = useStockStore((s) => s.dirtyByParent);
  const groups = useStockStore((s) => s.groups);
  const activeParentCode = useStockStore((s) => s.activeParentCode);
  const indexByCode = useStockStore((s) => s.indexByCode);

  const totalDirty = Object.values(dirtyByParent).reduce(
    (acc, changedChildren) => acc + changedChildren.size,
    0
  );

  function doExport(usuario: string) {
    if (!meta) return;

    setBusy(true);
    setAskName(false);

    try {
      const dirtyCodes = new Set<string>();
      for (const changed of Object.values(dirtyByParent)) {
        for (const code of changed) dirtyCodes.add(code);
      }

      const blob = exportCsv(rows, meta, dirtyCodes);
      downloadBlob(blob, buildExportFilename());

      // El aviso muestra el estoque completo (por cor × talla) del producto
      // abierto en pantalla, que es el que se acaba de trabajar.
      const activeGroup = groups.find((g) => g.parentCode === activeParentCode);
      if (activeGroup && activeParentCode) {
        const summary = buildStockSummary(activeGroup.childCodes, rows, indexByCode);
        const counted = dirtyByParent[activeParentCode]?.size ?? 0;
        const otherProducts = Object.entries(dirtyByParent).filter(
          ([code, set]) => code !== activeParentCode && set.size > 0
        ).length;

        notifyWorker(
          buildMessage({
            usuario,
            codigo: activeParentCode,
            descricao: activeGroup.parentRow['Descrição'] ?? '',
            summary,
            counted,
            totalVars: activeGroup.childCodes.length,
            otherProducts,
          })
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    const saved = getSavedUser();
    if (saved) {
      doExport(saved);
    } else {
      setInputName('');
      setAskName(true);
    }
  }

  function handleNameSubmit() {
    const name = inputName.trim();
    if (!name) return;
    saveUser(name);
    doExport(name);
  }

  if (askName) {
    return (
      <div class="flex flex-col gap-2">
        <p class="text-center text-sm text-txt2">¿Cuál es tu nombre? (se guarda para siempre)</p>
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="Tu nombre"
            value={inputName}
            onInput={(e) => setInputName((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            class="flex-1 rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm text-txt outline-none focus:border-accent"
            autoFocus
          />
          <button
            type="button"
            onClick={handleNameSubmit}
            disabled={!inputName.trim()}
            class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Exportar
          </button>
        </div>
        <button
          type="button"
          onClick={() => setAskName(false)}
          class="text-center text-xs text-txt2 underline"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={busy || !meta}
      class="w-full rounded-2xl bg-accent px-4 py-2.5 text-white transition-transform active:scale-[0.98] disabled:opacity-50"
    >
      <span class="block text-base font-semibold leading-tight">
        {busy ? 'Exportando CSV...' : 'Exportar CSV'}
      </span>

      <span class="mt-0.5 block text-xs font-medium leading-tight text-white/70">
        {totalDirty > 0
          ? `${totalDirty} variação${totalDirty === 1 ? '' : 'ões'} alterada${totalDirty === 1 ? '' : 's'}`
          : 'Sem alterações ainda'}
      </span>
    </button>
  );
}
