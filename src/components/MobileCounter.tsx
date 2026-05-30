import { useRef, useState } from 'preact/hooks';
import { useViewportKeyboard } from '../hooks/useViewportKeyboard';

export type MatrixCell = {
  childCode: string;
  stock: number;
  isDirty: boolean;
};

export type MatrixRow = {
  color: string;
  image: string | null;
  cells: Record<string, MatrixCell>;
};

interface Props {
  colors: MatrixRow[];
  sizes: string[];
  onUpdateCell: (cell: MatrixCell, value: string) => void;
}

/**
 * Vista de conteo optimizada para una sola mano (solo mobile).
 * Flujo: prenda en mano → tocar color (rail de miniaturas) → mirar la imagen
 * grande → tocar la talla → teclado numérico → escribir el total.
 *
 * La imagen hero se colapsa cuando el teclado está abierto para dejar lugar
 * a los inputs. "Próxima cor" avanza sin cerrar el teclado.
 */
export function MobileCounter({ colors, sizes, onUpdateCell }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const keyboardOpen = useViewportKeyboard();
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  const idx = Math.min(activeIdx, colors.length - 1);
  const active = colors[idx];

  function goToColor(nextIdx: number) {
    const clamped = (nextIdx + colors.length) % colors.length;
    setActiveIdx(clamped);
    // Re-enfocar el primer input para mantener el teclado abierto.
    requestAnimationFrame(() => firstInputRef.current?.focus());
  }

  if (!active) return null;

  return (
    <div class="md:hidden">
      {/* Imagen hero del color activo — se colapsa con el teclado abierto */}
      <div
        class={`relative overflow-hidden rounded-3xl bg-surface ring-1 ring-line transition-[height] duration-200 ${
          keyboardOpen ? 'h-20' : 'h-[34vh]'
        }`}
      >
        {active.image ? (
          <img
            src={active.image}
            alt={active.color}
            class="h-full w-full object-contain p-2"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div class="flex h-full items-center justify-center text-sm text-txt3">
            Sem imagem
          </div>
        )}

        <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
          <p class="text-xs font-medium text-white/70">Cor</p>
          <p class="text-lg font-semibold text-white">{active.color}</p>
        </div>
      </div>

      {/* Rail de colores (miniaturas, no códigos) */}
      <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
        {colors.map((c, i) => (
          <button
            key={c.color}
            type="button"
            onClick={() => setActiveIdx(i)}
            aria-pressed={i === idx}
            aria-label={`Cor ${c.color}`}
            class={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl ring-2 transition ${
              i === idx ? 'ring-accent' : 'ring-line'
            }`}
          >
            {c.image ? (
              <img
                src={c.image}
                alt={c.color}
                loading="lazy"
                class="h-full w-full bg-surface object-contain p-0.5"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.visibility = 'hidden';
                }}
              />
            ) : (
              <span class="flex h-full w-full items-center justify-center bg-surface text-[10px] font-medium text-txt2">
                {c.color}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Inputs de talla del color activo */}
      <div class="mt-4 grid grid-cols-2 gap-3">
        {sizes.map((size, sIdx) => {
          const cell = active.cells[size];

          return (
            <div key={size}>
              <p class="mb-1 text-center text-xs font-semibold text-txt2">{size}</p>
              {cell ? (
                <input
                  ref={sIdx === 0 ? firstInputRef : undefined}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  enterKeyHint="next"
                  value={String(cell.stock)}
                  onFocus={(e) => (e.target as HTMLInputElement).select()}
                  onInput={(e) => onUpdateCell(cell, (e.target as HTMLInputElement).value)}
                  class={`h-16 w-full rounded-2xl border-2 bg-surface text-center text-2xl font-semibold tabular-nums text-txt focus:outline-none focus:ring-4 ${
                    cell.isDirty
                      ? 'border-ok/60 focus:border-ok focus:ring-ok/20'
                      : 'border-line focus:border-accent focus:ring-accent/20'
                  }`}
                />
              ) : (
                <div class="flex h-16 items-center justify-center rounded-2xl border-2 border-dashed border-line text-txt3">
                  –
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navegación rápida entre colores — solo con el teclado abierto, cuando
          sirve para avanzar sin cerrarlo y la imagen ya está colapsada. */}
      {keyboardOpen && colors.length > 1 && (
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => goToColor(idx - 1)}
            class="flex-1 rounded-2xl border border-line bg-surface py-3 text-sm font-medium text-txt2 transition-transform active:scale-[0.98]"
          >
            ‹ Anterior
          </button>
          <button
            type="button"
            onClick={() => goToColor(idx + 1)}
            class="flex-[2] rounded-2xl bg-accent py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            Próxima cor ›
          </button>
        </div>
      )}
    </div>
  );
}
