import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-black/60 border border-neon-red/40 text-xs font-mono flex flex-col items-center justify-center gap-2 text-center my-2">
          <AlertCircle size={20} className="text-neon-red animate-pulse" />
          <span className="text-neon-red font-bold">
            {this.props.fallbackTitle || 'Component encountered an issue'}
          </span>
          <span className="text-slate-400 text-[10px] max-w-sm truncate">
            {this.state.error?.message || 'Unknown runtime error'}
          </span>
          <button
            onClick={this.handleReset}
            className="mt-1 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1 transition-all"
          >
            <RefreshCw size={11} /> Retry Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
