import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps a single broken screen from taking down the whole player. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('HIRO SEGAWA crashed a screen:', error, info.componentStack);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-[#04050c] px-6 text-center">
        <div className="glass max-w-md rounded-3xl p-8">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl border border-white/10 bg-rose-500/10">
            <TriangleAlert className="size-5 text-rose-300" aria-hidden />
          </div>
          <h1 className="font-display text-2xl text-white">The screen hit a wrong note</h1>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            Playback and your library are safe. Reload to continue where you left off.
          </p>
          <p className="mt-3 break-words rounded-xl border border-white/8 bg-black/30 p-2 text-[11px] text-white/40">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-6 w-full"
          >
            <RotateCcw className="size-4" aria-hidden />
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
