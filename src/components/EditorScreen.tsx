import { useEffect, useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { StockMatrix } from './StockMatrix';
import { ExportButton } from './ExportButton';
import { firstImageUrl } from '../lib/grouping';

export function EditorScreen() {
  const activeParentCode = useStockStore((s) => s.activeParentCode);
  const group = useStockStore((s) =>
    s.groups.find((g) => g.parentCode === activeParentCode)
  );
  const reset = useStockStore((s) => s.reset);
  const persistActive = useStockStore((s) => s.persistActive);

  const dirtyByParent = useStockStore((s) => s.dirtyByParent);
  const dirtyCount = activeParentCode ? (dirtyByParent[activeParentCode]?.size ?? 0) : 0;

  const [confirmBack, setConfirmBack] = useState(false);
  const [confirmZero, setConfirmZero] = useState(false);
  const [confirmDiscount, setConfirmDiscount] = useState(false);
  const resetParentStock = useStockStore((s) => s.resetParentStock);
  const discountParentStock = useStockStore((s) => s.discountParentStock);

  useEffect(() => {
    return () => {
      persistActive();
    };
  }, [activeParentCode, persistActive]);

  const parentRow = group?.parentRow;
  const parentImg = parentRow ? firstImageUrl(parentRow) : null;

  if (!group || !parentRow) {
    return (
      <div class="flex min-h-screen items-center justify-center bg-bg p-6 text-center text-txt2">
        <div>
          <p class="mb-4">Produto não encontrado.</p>
          <button
            type="button"
            class="rounded-xl bg-accent px-5 py-3 font-semibold text-white"
            onClick={() => reset()}
          >
            Carregar inventário
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="flex min-h-screen flex-col bg-bg">
      <header class="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div class="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 md:gap-4 md:px-8 md:py-4">
          <button
            type="button"
            onClick={() => {
              if (dirtyCount > 0) {
                setConfirmBack(true);
              } else {
                persistActive();
                reset();
              }
            }}
            class="-ml-2 flex min-h-touch min-w-touch items-center justify-center rounded-xl text-2xl text-txt2 hover:bg-surface"
            aria-label="Carregar outro inventário"
          >
            ‹
          </button>

          <div class="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-surface ring-1 ring-line md:h-20 md:w-20">
            {parentImg && (
              <img
                src={parentImg}
                alt={parentRow['Descrição'] ?? group.parentCode}
                referrerpolicy="no-referrer"
                class="h-full w-full object-contain p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>

          <div class="min-w-0 flex-1">
            <p class="font-mono text-xs font-semibold uppercase tracking-wide text-accent">
              {group.parentCode}
            </p>

            <h1 class="truncate text-base font-semibold text-txt md:text-xl">
              {parentRow['Descrição']}
            </h1>

            <p class="mt-1 text-xs text-txt2 md:text-sm">
              {group.childCodes.length} variações
            </p>
          </div>
        </div>
      </header>

      {confirmBack && (
        <div
          role="alert"
          class="border-b border-danger/30 bg-danger/10 px-4 py-3"
        >
          <p class="mb-2 text-sm text-danger">
            Há contagens não exportadas. Voltar vai descartá-las.
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              onClick={() => {
                reset();
              }}
              class="flex-1 rounded-2xl border-2 border-danger/40 bg-danger/10 py-2.5 text-sm font-semibold text-danger transition-transform active:scale-[0.98]"
            >
              Descartar e voltar
            </button>
            <button
              type="button"
              onClick={() => setConfirmBack(false)}
              class="flex-1 rounded-2xl border-2 border-line bg-surface py-2.5 text-sm font-semibold text-txt2 transition-transform active:scale-[0.98]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <main class="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-28 md:px-8 md:py-8">
        <StockMatrix parentCode={group.parentCode} childCodes={group.childCodes} />
      </main>

      <footer class="sticky bottom-0 z-20 border-t border-line bg-bg/90 px-3 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <div class="mx-auto flex w-full max-w-7xl justify-center md:justify-end">
          <div class="flex w-full flex-col gap-2 md:max-w-md">
            <ExportButton />

            <details
              class="group"
              onToggle={(e) => {
                // Al cerrar el menú, descartamos cualquier confirmación pendiente.
                if (!(e.currentTarget as HTMLDetailsElement).open) {
                  setConfirmDiscount(false);
                  setConfirmZero(false);
                }
              }}
            >
              <summary class="flex w-full cursor-pointer list-none items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface py-2 text-sm font-medium text-txt2 transition-transform active:scale-[0.98]">
                Mais ações
                <span class="text-txt2 transition-transform group-open:rotate-180">⌄</span>
              </summary>

              <div class="mt-2 flex flex-col gap-2">
                {confirmDiscount ? (
                  <div class="flex flex-col gap-1.5">
                    <p class="text-center text-xs text-txt2">
                      Vai descontar 2 de cada variação com estoque ≥ 12. As demais ficam intactas.
                    </p>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          discountParentStock(group.parentCode);
                          setConfirmDiscount(false);
                        }}
                        class="flex-1 rounded-2xl border-2 border-accent/40 bg-accent/10 py-2.5 text-sm font-semibold text-accent transition-transform active:scale-[0.98]"
                      >
                        Confirmar −2
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDiscount(false)}
                        class="flex-1 rounded-2xl border-2 border-line bg-surface py-2.5 text-sm font-semibold text-txt2 transition-transform active:scale-[0.98]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDiscount(true)}
                    class="w-full rounded-2xl border border-line bg-surface py-2.5 text-sm font-medium text-txt transition-transform active:scale-[0.98]"
                  >
                    −2 nas variações ≥ 12
                  </button>
                )}

                {confirmZero ? (
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetParentStock(group.parentCode);
                        setConfirmZero(false);
                      }}
                      class="flex-1 rounded-2xl border-2 border-danger/40 bg-danger/10 py-2.5 text-sm font-semibold text-danger transition-transform active:scale-[0.98]"
                    >
                      Confirmar zeragem
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmZero(false)}
                      class="flex-1 rounded-2xl border-2 border-line bg-surface py-2.5 text-sm font-semibold text-txt2 transition-transform active:scale-[0.98]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmZero(true)}
                    class="w-full rounded-2xl border border-line bg-surface py-2.5 text-sm font-medium text-txt2 transition-transform active:scale-[0.98]"
                  >
                    Zerar tudo
                  </button>
                )}
              </div>
            </details>
          </div>
        </div>
      </footer>
    </div>
  );
}
