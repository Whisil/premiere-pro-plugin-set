import "@spectrum-web-components/button/sp-button.js";
import React from "react";
import { createRoot } from "react-dom/client";
import { FRAME_GATE_PRESETS } from "@moneymoves/contracts";
import { App } from "./App.js";
import { applyEffectPreset, removeEffect } from "./premiere.js";
import "./styles.css";

function mount(): void {
  const rootElement = document.getElementById("root");
  if (!rootElement || rootElement.dataset.mounted === "true") return;
  rootElement.dataset.mounted = "true";
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
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
