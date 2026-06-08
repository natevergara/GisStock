import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { firstImageUrl } from '../lib/grouping';
import { parseDescricao } from '../lib/parseDescricao';
import { parseStock, sortSizes } from '../lib/stock';
import { MobileCounter, type MatrixCell, type MatrixRow } from './MobileCounter';

interface Props {
  parentCode: string;
  childCodes: string[];
}

const EMPTY_DIRTY: ReadonlySet<string> = new Set();

export function StockMatrix({ parentCode, childCodes }: Props) {
  const [openImage, setOpenImage] = useState<{ src: string; label: string } | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const rows = useStockStore((s) => s.rows);
  const indexByCode = useStockStore((s) => s.indexByCode);
  const dirtyByParent = useStockStore((s) => s.dirtyByParent);
  const updateChildStock = useStockStore((s) => s.updateChildStock);

  const dirtySet = dirtyByParent[parentCode] ?? EMPTY_DIRTY;

  const { colors, sizes } = useMemo(() => {
    const byColor = new Map<string, MatrixRow>();
    const sizeSet = new Set<string>();

    for (const childCode of childCodes) {
      const idx = indexByCode.get(childCode);
      if (idx === undefined) continue;

      const row = rows[idx];
      const parsed = parseDescricao(row['Descrição'] ?? '');
      const color = parsed.cor || 'Sem cor';
      const size = parsed.tamanho || 'ÚNICO';
      const stock = parseStock(row['Estoque']);

      sizeSet.add(size);

      const existing = byColor.get(color) ?? {
        color,
        image: firstImageUrl(row),
        cells: {},
      };

      if (!existing.image) {
        existing.image = firstImageUrl(row);
      }

      existing.cells[size] = {
        childCode,
        stock,
        isDirty: dirtySet.has(childCode),
      };

      byColor.set(color, existing);
    }

    return {
      // Orden natural: E1, E2, … E10, E11 (no E10, E11, … E1).
      colors: Array.from(byColor.values()).sort((a, b) =>
        a.color.localeCompare(b.color, 'pt-BR', { numeric: true })
      ),
      sizes: sortSizes(Array.from(sizeSet)),
    };
  }, [childCodes, dirtySet, indexByCode, rows]);

  function updateCell(cell: MatrixCell, value: string) {
    updateChildStock(parentCode, cell.childCode, value);
  }

  useEffect(() => {
    if (!openImage) return;
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenImage(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openImage]);

  useEffect(() => {
    if (openImage) return;
    lastTriggerRef.current?.focus();
  }, [openImage]);

  if (colors.length === 0) {
    return (
      <div class="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-txt2">
        Sem variações para mostrar
      </div>
    );
  }

  return (
    <>
      {/* Mobile: vista de conteo a una mano */}
      <MobileCounter colors={colors} sizes={sizes} onUpdateCell={updateCell} />

      {/* Desktop: matriz Cor × Tamanho */}
      <section class="hidden overflow-hidden rounded-3xl border border-line bg-surface md:block">
        <div class="border-b border-line px-4 py-3 md:px-6 md:py-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-accent">
            Contagem
          </p>
          <h2 class="mt-0.5 text-lg font-semibold text-txt">
            Cor x Tamanho
          </h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-b border-line bg-surface2">
                <th class="min-w-[240px] bg-surface2 px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-txt2">
                  Cor
                </th>
                {sizes.map((size) => (
                  <th key={size} class="min-w-[140px] px-3 py-3 text-center text-sm font-semibold text-txt">
                    {size}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {colors.map((colorRow) => (
                <tr key={colorRow.color} class="border-b border-line last:border-b-0">
                  <td class="px-4 py-3 align-middle">
                    <ColorLabel
                      color={colorRow.color}
                      image={colorRow.image}
                      onOpenImage={(image, triggerEl) => {
                        lastTriggerRef.current = triggerEl;
                        setOpenImage(image);
                      }}
                    />
                  </td>

                  {sizes.map((size) => {
                    const cell = colorRow.cells[size];

                    return (
                      <td key={size} class="border-l border-line px-3 py-3 text-center align-middle">
                        {cell ? (
                          <StockInput
                            value={cell.stock}
                            isDirty={cell.isDirty}
                            label={`${colorRow.color} tamanho ${size}`}
                            onInput={(value) => updateCell(cell, value)}
                          />
                        ) : (
                          <span class="text-txt3">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {openImage && (
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenImage(null)}
        >
          <button
            type="button"
            ref={closeButtonRef}
            class="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white"
            onClick={() => setOpenImage(null)}
            aria-label="Fechar imagem"
          >
            x
          </button>

          <img
            src={openImage.src}
            alt={openImage.label}
            referrerpolicy="no-referrer"
            class="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div class="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/50 p-3 text-center text-sm font-medium text-white">
            {openImage.label}
          </div>
        </div>
      )}
    </>
  );
}

function ColorLabel({
  color,
  image,
  onOpenImage,
}: {
  color: string;
  image: string | null;
  onOpenImage: (image: { src: string; label: string }, triggerEl: HTMLButtonElement) => void;
}) {
  return (
    <div class="flex items-center gap-2.5">
      <button
        type="button"
        tabIndex={-1}
        disabled={!image}
        onClick={(e) => {
          if (!image) return;
          onOpenImage({ src: image, label: color }, e.currentTarget as HTMLButtonElement);
        }}
        class="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-surface2 ring-1 ring-line transition hover:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default"
        aria-label={`Ampliar imagem de ${color}`}
      >
        {image && (
          <img
            src={image}
            alt={color}
            loading="lazy"
            referrerpolicy="no-referrer"
            class="h-full w-full object-contain p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </button>

      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-txt">{color}</p>
        {image && <p class="text-xs font-medium text-accent">Ver foto</p>}
      </div>
    </div>
  );
}

function StockInput({ value, isDirty, label, onInput }: { value: number; isDirty: boolean; label: string; onInput: (value: string) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      enterKeyHint="next"
      aria-label={label}
      value={String(value)}
      onFocus={(e) => (e.target as HTMLInputElement).select()}
      onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      class={`h-14 w-full rounded-xl border-2 bg-surface text-center text-xl font-semibold tabular-nums text-txt focus:outline-none focus:ring-4 md:min-h-fat md:text-2xl ${
        isDirty
          ? 'border-ok/60 focus:border-ok focus:ring-ok/20'
          : 'border-line focus:border-accent focus:ring-accent/20'
      }`}
    />
  );
}

