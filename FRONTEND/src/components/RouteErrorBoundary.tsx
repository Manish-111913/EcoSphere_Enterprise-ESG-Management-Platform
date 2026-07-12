import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Bumping this (e.g. the route pathname) resets the boundary on navigation. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors from the routed page so a single bad screen shows
 * a recoverable error card inside the app shell instead of unmounting the whole
 * React tree (which renders a blank page). Resets automatically when the route
 * changes so navigating away from the broken page restores normal rendering.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  // This project ships without @types/react, so React.Component resolves to an
  // untyped (any) base and its members aren't visible. Declare the ones we use
  // so the file type-checks without pulling in React typings app-wide.
  declare props: Props;
  declare setState: (state: Partial<State>) => void;
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it in the console for diagnosis in dev.
    // eslint-disable-next-line no-console
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold text-neutral-text-dark font-sans">Something went wrong on this page</h2>
          <p className="text-sm text-neutral-text-muted">
            The page hit an unexpected error and couldn't render. You can retry, or navigate to another module from the sidebar.
          </p>
          <pre className="text-[11px] text-left bg-neutral-bg border border-neutral-border rounded-lg p-3 overflow-auto text-red-700 max-h-40">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="inline-flex items-center gap-2 bg-primary-teal text-white font-semibold text-xs px-4 py-2.5 rounded-button shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
