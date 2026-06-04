import { Component } from 'preact';
import type { ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
          <p class="text-lg font-semibold text-txt">Algo deu errado.</p>
          <p class="text-sm text-txt2">
            {this.state.error.message || 'Erro inesperado.'}
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            class="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
