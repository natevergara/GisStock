import { useState } from 'preact/hooks';

interface Props {
  action: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function NamePrompt({ action, onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div class="flex flex-col gap-2">
      <p class="text-center text-sm text-txt2">Qual é o seu nome? (salvo para sempre)</p>
      <div class="flex gap-2">
        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          class="flex-1 rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm text-txt outline-none focus:border-accent"
          autoFocus
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim()}
          class="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {action}
        </button>
      </div>
      <button
        type="button"
        onClick={onCancel}
        class="text-center text-xs text-txt2 underline"
      >
        Cancelar
      </button>
    </div>
  );
}
