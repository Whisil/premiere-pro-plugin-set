import "@spectrum-web-components/button/sp-button.js";
import React from "react";
import { createRoot } from "react-dom/client";
import { FRAME_GATE_PRESETS } from "@moneymoves/contracts";
import { App } from "./App.js";
import { applyEffectPreset, removeEffect } from "./premiere.js";
import "./styles.css";

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
          <p className="hint">
            Reload the plugin from UXP Developer Tool. If this persists, copy
            this message from the UDT Logs panel.
          </p>
        </main>
      );
    }
    return this.props.children;
  }
}

function mount(): void {
  const rootElement = document.getElementById("root");
  if (!rootElement || rootElement.dataset.mounted === "true") return;
  rootElement.dataset.mounted = "true";
  createRoot(rootElement).render(
    <React.StrictMode>
      <PanelErrorBoundary>
        <App />
      </PanelErrorBoundary>
    </React.StrictMode>,
  );
}

mount();

try {
  const entrypoints = require("uxp").entrypoints;
  entrypoints.setup({
    panels: {
      moneymovesPanel: { show: mount },
    },
    commands: {
      applyThrottleIn: () => applyEffectPreset(FRAME_GATE_PRESETS[0]!),
      applyThrottleOut: () => applyEffectPreset(FRAME_GATE_PRESETS[1]!),
      applyThrottleBoth: () => applyEffectPreset(FRAME_GATE_PRESETS[2]!),
      applyHardStutter: () => applyEffectPreset(FRAME_GATE_PRESETS[3]!),
      removeFrameGate: () =>
        removeEffect("com.moneymoves.frame-gate", "Frame Gate"),
    },
  });
} catch {
  // Browser preview: UXP is intentionally unavailable.
}
