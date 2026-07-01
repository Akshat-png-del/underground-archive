"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { playbackDebugError } from "@/lib/music/playback-debug";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Isolates player UI failures from the rest of the app.
 * Playback engine on document.body is unaffected.
 */
export class PlayerErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    playbackDebugError("UI", "GlobalPlayer error boundary caught", { error, info });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="theater-player pointer-events-auto fixed bottom-4 right-4 z-[10050] rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-lg"
          role="alert"
        >
          <p className="text-sm font-medium text-foreground">Player unavailable</p>
          <p className="mt-1 text-xs text-muted">
            Something went wrong displaying the player. Playback may still be running in the
            background.
          </p>
          <button
            type="button"
            className="mt-3 text-xs text-accent underline-offset-4 hover:underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
