import { useRef, useState } from 'preact/hooks';
import { useStockStore } from '../store/useStockStore';
import { parseCsv } from '../lib/csv';
import { validateHeaders, validateRows } from '../schema';

export function UploadScreen() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loadData = useStockStore((s) => s.loadData);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);

    try {
      const { rows, meta } = await parseCsv(file);
      const headerCheck = validateHeaders(meta.fields);

      if (!headerCheck.ok) {
        setError(`Faltam colunas necessárias: ${headerCheck.missing.join(', ')}`);
        return;
      }

      if (rows.length === 0) {
        setError('O arquivo não contém produtos.');
        return;
      }

      const rowCheck = validateRows(rows);

      if (!rowCheck.ok) {
        setError(rowCheck.message);
        return;
      }

      loadData(rows, meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.');
    } finally {
      setBusy(false);
    }
  }

  function onChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      handleFile(file);
    }

    target.value = '';
  }

  return (
    <div class="min-h-screen bg-bg px-5 py-10 md:px-8">
      <div class="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <main class="w-full">
          <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-4">
              <img
                src="icons/favicon.svg"
                alt="GisStock"
                width="64"
                height="64"
                class="h-16 w-16 rounded-2xl ring-1 ring-line"
              />

              <div>
                <p class="text-sm font-semibold tracking-wide text-brand">GisStock</p>

                <h1 class="mt-1 text-3xl font-semibold leading-tight text-txt">
                  Controle visual de estoque
                </h1>

                <p class="mt-2 text-sm leading-6 text-txt2">
                  Carregue o CSV do Bling e conte o estoque por cor e tamanho.
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              class="hidden"
              onChange={onChange}
            />

            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              class="min-h-fat w-full rounded-2xl bg-accent px-5 text-lg font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? 'Carregando...' : 'Carregar inventário'}
            </button>

            {error && (
              <div
                role="alert"
                class="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <details class="group rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
              <summary class="flex cursor-pointer list-none items-center justify-between font-medium text-txt">
                Como exportar do Bling?
                <span class="text-txt2 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <p class="mt-2 leading-6 text-txt2">
                No Bling, acesse <span class="text-txt">Cadastros → Produtos</span>, selecione o
                produto e use <span class="text-txt">Exportar → CSV</span>. Carregue esse arquivo aqui.
              </p>
            </details>

            <p class="flex items-center gap-2 text-xs leading-5 text-txt2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="flex-shrink-0"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Seus dados não saem do dispositivo. Tudo é processado no seu navegador.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
