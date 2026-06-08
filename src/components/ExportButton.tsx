import { useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { buildExportFilename, downloadBlob, exportCsv } from '../lib/csv';
import {
  buildPrivateMessage,
  getSavedUser,
  notifyWorker,
  saveUser,
} from '../lib/telegram';
import { NamePrompt } from './NamePrompt';

export function ExportButton() {
  const [busy, setBusy] = useState(false);
  const [askName, setAskName] = useState(false);

  const rows = useStockStore((s) => s.rows);
  const meta = useStockStore((s) => s.meta);
  const dirtyByParent = useStockStore((s) => s.dirtyByParent);
  const groups = useStockStore((s) => s.groups);
  const activeParentCode = useStockStore((s) => s.activeParentCode);

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

      // Aviso privado (solo el dueño): resumen corto sin tabla, fire-and-forget.
      const activeGroup = groups.find((g) => g.parentCode === activeParentCode);
      if (activeGroup && activeParentCode) {
        const counted = dirtyByParent[activeParentCode]?.size ?? 0;
        notifyWorker(
          buildPrivateMessage({
            usuario,
            codigo: activeParentCode,
            descricao: activeGroup.parentRow['Descrição'] ?? '',
            counted,
            totalVars: activeGroup.childCodes.length,
          }),
          'private'
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
      setAskName(true);
    }
  }

  if (askName) {
    return (
      <NamePrompt
        action="Exportar"
        onSubmit={(name) => {
          saveUser(name);
          doExport(name);
        }}
        onCancel={() => setAskName(false)}
      />
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
