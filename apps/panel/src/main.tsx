import React from "react";
import { render } from "react-dom";
import { App } from "./App.js";
import "./styles.css";

declare global {
  interface Window {
    __moneymovesMount?: (node?: HTMLElement | null) => void;
    __moneymovesPanelRoot?: HTMLElement | null;
  }
}

type PanelErrorBoundaryState = { error?: Error };

class PanelErrorBoundary extends React.Component<
  React.PropsWithChildren,
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(
      "MoneyMoves panel failed to render",
      error,
      info.componentStack,
    );
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <main className="startup-error">
          <p className="eyebrow">MONEYMOVES STARTUP ERROR</p>
          <h1>The panel could not render.</h1>
          <p>{this.state.error.message}</p>
        </main>
      );
    }
    return this.props.children;
  }
}

function appTree(): React.ReactElement {
  return (
    <React.StrictMode>
      <PanelErrorBoundary>
        <App />
      </PanelErrorBoundary>
    </React.StrictMode>
  );
}

function mount(node?: HTMLElement | null): void {
  const rootElement =
    node ??
    window.__moneymovesPanelRoot ??
    document.getElementById("root") ??
    document.body;
  if (!(rootElement instanceof HTMLElement)) return;
  try {
    render(appTree(), rootElement);
  } catch (error) {
    rootElement.innerHTML =
      '<main class="startup-error"><p class="eyebrow">MONEYMOVES STARTUP ERROR</p><h1>The panel could not render.</h1><p>' +
      String(error instanceof Error ? error.message : error) +
      "</p></main>";
  }
}

window.__moneymovesMount = mount;
mount();
