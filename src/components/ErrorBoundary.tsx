import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  // Rendered in place of the children once something has thrown. Receives the
  // error and a callback that clears the error state and retries the render.
  fallback: (error: Error, retry: () => void) => ReactNode;
  // Changing this clears the error automatically. Navigating away from a view
  // that threw should not require the user to press "retry" first.
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// React unmounts the entire tree when a component throws during render, so
// without a boundary a single bad value anywhere leaves a blank window with no
// message and no way back. Catching it is still class-only: there is no hook
// equivalent to componentDidCatch.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The component stack is the only place that says *which* component threw,
    // and React does not include it in the error itself.
    console.error("Render failed:", error, info.componentStack);
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.error !== null && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error !== null) return this.props.fallback(error, this.retry);
    return this.props.children;
  }
}
