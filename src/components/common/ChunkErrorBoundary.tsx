import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

function isChunkLoadError(error?: Error): boolean {
  if (!error) return false;
  const name = error.name || "";
  const msg = error.message || "";
  return (
    name === "ChunkLoadError" ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Importing a module script failed")
  );
}

/**
 * Catches dynamic import / chunk loading errors and unexpected page render errors.
 * Distinguishes real chunk-load failures from runtime/render errors without auto-reload loops.
 */
export default class ChunkErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by ChunkErrorBoundary:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  private handleBackToDashboard = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.assign("/");
  };

  public render() {
    if (this.state.hasError) {
      const isChunk = isChunkLoadError(this.state.error);
      return (
        <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-xs">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
            {isChunk ? "Unable to load page content" : "Something went wrong on this page"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            {isChunk
              ? "A network interruption or updated version occurred. Please check your connection and tap reload to try again."
              : "An unexpected error occurred while rendering this view. You can reload or return to the dashboard."}
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload</span>
            </button>
            {!isChunk && (
              <button
                type="button"
                onClick={this.handleBackToDashboard}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Back to dashboard</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
