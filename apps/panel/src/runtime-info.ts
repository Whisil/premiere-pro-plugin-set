export interface RuntimeInfo {
  host: string;
  panelVersion: string;
  uxpVersion: string;
  platform: string;
}

const unavailable: RuntimeInfo = {
  host: "Unavailable",
  panelVersion: "Unavailable",
  uxpVersion: "Unavailable",
  platform: "Unavailable",
};

export function getRuntimeInfo(
  loadUxp: () => any = () => require("uxp"),
): RuntimeInfo {
  try {
    const uxp = loadUxp();
    return {
      host: `${uxp.host?.name ?? "Premiere Pro"} ${uxp.host?.version ?? ""}`.trim(),
      panelVersion: String(uxp.versions?.plugin ?? "Unavailable"),
      uxpVersion: String(uxp.versions?.uxp ?? "Unavailable"),
      platform: String(uxp.os?.platform?.() ?? "Unavailable"),
    };
  } catch {
    return unavailable;
  }
}
