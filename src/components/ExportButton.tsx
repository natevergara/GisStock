import { useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { buildExportFilename, downloadBlob, exportCsv } from '../lib/csv';

const WORKER_URL = 'https://crimson-dream-a84d.natev.workers.dev';
const USER_KEY = 'gisstock_usuario';

function getSavedUser(): string {
  return localStorage.getItem(USER_KEY) ?? '';
}

function saveUser(name: string): void {
  localStorage.setItem(USER_KEY, name.trim());
}

function notifyWorker(payload: {
  usuario: string;
  producto: string;
  codigo: string;
  variaciones: number;
}): void {
  // fire-and-forget: no bloqueamos la exportación si el Worker falla
  fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export function ExportButton() {
  const [busy, setBusy] = useState(false);
  const [askName, setAskName] = useState(false);
  const [inputName, setInputName] = useState('');

  const rows = useStockStore((s) => s.rows);
  const meta = useStockStore((s) => s.meta);
  const dirtyByParent = useStockStore((s) => s.dirtyByParent);
  const groups = useStockStore((s) => s.groups);

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

      // El aviso debe reflejar los productos realmente modificados, no el que
      // esté abierto en pantalla (pueden no coincidir).
      const dirtyParents = Object.entries(dirtyByParent)
        .filter(([, children]) => children.size > 0)
        .map(([code]) => code);

      let producto: string;
      let codigo: string;
      if (dirtyParents.length === 1) {
        const g = groups.find((gr) => gr.parentCode === dirtyParents[0]);
        producto = g?.parentRow?.['Descrição'] ?? dirtyParents[0];
        codigo = dirtyParents[0];
      } else {
        producto = `${dirtyParents.length} productos`;
        codigo = '';
      }

      notifyWorker({ usuario, producto, codigo, variaciones: totalDirty });
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
