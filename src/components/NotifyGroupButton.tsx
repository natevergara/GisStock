import { useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { buildStockSummary } from '../lib/stock';
import { buildGroupMessage, getSavedUser, notifyWorker, saveUser } from '../lib/telegram';
import { NamePrompt } from './NamePrompt';

type Status = 'idle' | 'asking-name' | 'sending' | 'sent' | 'error';

export function NotifyGroupButton() {
  const [status, setStatus] = useState<Status>('idle');

  const rows = useStockStore((s) => s.rows);
  const dirtyByParent = useStockStore((s) => s.dirtyByParent);
  const groups = useStockStore((s) => s.groups);
  const activeParentCode = useStockStore((s) => s.activeParentCode);
  const indexByCode = useStockStore((s) => s.indexByCode);

  const totalDirty = Object.values(dirtyByParent).reduce((acc, s) => acc + s.size, 0);

  async function doNotify(usuario: string) {
    setStatus('sending');

    const activeGroup = groups.find((g) => g.parentCode === activeParentCode);
    if (!activeGroup || !activeParentCode) {
      setStatus('idle');
      return;
    }

    const summary = buildStockSummary(activeGroup.childCodes, rows, indexByCode);
    const counted = dirtyByParent[activeParentCode]?.size ?? 0;
    const otherProducts = Object.entries(dirtyByParent).filter(
      ([code, s]) => code !== activeParentCode && s.size > 0
    ).length;

    const ok = await notifyWorker(
      buildGroupMessage({
        usuario,
        codigo: activeParentCode,
        descricao: activeGroup.parentRow['Descrição'] ?? '',
        summary,
        counted,
        totalVars: activeGroup.childCodes.length,
        otherProducts,
      }),
      'group'
    );

    setStatus(ok ? 'sent' : 'error');
    if (ok) setTimeout(() => setStatus('idle'), 2000);
  }

  function handleClick() {
    const saved = getSavedUser();
    if (saved) {
      doNotify(saved);
    } else {
      setStatus('asking-name');
    }
  }

  if (status === 'asking-name') {
    return (
      <NamePrompt
        action="Notificar"
        onSubmit={(name) => {
          saveUser(name);
          doNotify(name);
        }}
        onCancel={() => setStatus('idle')}
      />
    );
  }

  const label =
    status === 'sending' ? 'Enviando…' :
    status === 'sent' ? '✓ Enviado ao grupo' :
    status === 'error' ? 'Erro — tentar de novo' :
    'Notificar grupo';

  const isError = status === 'error';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={totalDirty === 0 || status === 'sending'}
      class={`w-full rounded-2xl border py-2.5 text-sm font-medium transition-transform active:scale-[0.98] disabled:opacity-50 ${
        isError
          ? 'border-danger/40 bg-danger/10 text-danger'
          : 'border-line bg-surface text-txt'
      }`}
    >
      {label}
    </button>
  );
}
