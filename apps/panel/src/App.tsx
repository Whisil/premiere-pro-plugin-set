import {
  EFFECTS,
  FRAME_GATE_PRESETS,
  SCHEMA_VERSION,
  brandTokens,
  type AsciiTitleJobRequest,
  type MapJobRequest,
  type RenderJob,
} from "@moneymoves/contracts";
import { useEffect, useMemo, useState } from "react";
import {
  applyEffect,
  applyEffectPreset,
  chooseAndInsertMogrt,
  hostDiagnostics,
  importGeneratedFile,
  removeEffect,
} from "./premiere.js";
import {
  cancelRenderJob,
  getRendererToken,
  rendererHealth,
  setRendererToken,
  submitRenderJob,
  waitForRenderJob,
} from "./renderer.js";

type Notice = { tone: "info" | "success" | "error"; message: string };

export function App() {
  const [notice, setNotice] = useState<Notice>({
    tone: "info",
    message: "Ready.",
  });
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [rendererOnline, setRendererOnline] = useState(false);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [country, setCountry] = useState("USA");
  const [asciiText, setAsciiText] = useState("MONEY MOVES");
  const [asciiFont, setAsciiFont] =
    useState<AsciiTitleJobRequest["font"]>("Standard");
  const [asciiAnimation, setAsciiAnimation] =
    useState<AsciiTitleJobRequest["animation"]>("reveal");
  const [mapAnimation, setMapAnimation] =
    useState<MapJobRequest["animation"]>("fly-to");
  const [labels, setLabels] = useState(true);
  const [width, setWidth] = useState(3840);
  const [height, setHeight] = useState(2160);
  const [fps, setFps] = useState(30);
  const [paletteId, setPaletteId] = useState("moneymoves-core");
  const [token, setToken] = useState(getRendererToken());
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});

  useEffect(() => {
    void refreshDiagnostics();
  }, []);

  const filteredEffects = useMemo(
    () =>
      EFFECTS.filter(([name]) =>
        name.toLowerCase().includes(search.toLowerCase().trim()),
      ),
    [search],
  );
  const mapCountries = useMemo(
    () =>
      country
        .split(",")
        .map((code) => code.trim())
        .filter((code) => /^[A-Z]{3}$/.test(code)),
    [country],
  );

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  }

  async function refreshDiagnostics(): Promise<void> {
    const [online, host] = await Promise.all([
      rendererHealth(),
      hostDiagnostics(),
    ]);
    setRendererOnline(online);
    setDiagnostics(host);
  }

  async function renderAndImport(
    request: MapJobRequest | AsciiTitleJobRequest,
  ): Promise<void> {
    const created = await submitRenderJob(request);
    setJobs((current) => [
      created,
      ...current.filter((job) => job.id !== created.id),
    ]);
    const completed = await waitForRenderJob(created, (updated) => {
      setJobs((current) => [
        updated,
        ...current.filter((job) => job.id !== updated.id),
      ]);
    });
    if (!completed.outputPath)
      throw new Error("Renderer completed without an output path.");
    await importGeneratedFile(completed.outputPath);
    setNotice({
      tone: "success",
      message: `Rendered and imported ${completed.outputPath}`,
    });
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">PREMIERE TOOLKIT</p>
          <h1>MoneyMoves</h1>
        </div>
        <span
          className={`health ${rendererOnline ? "online" : "offline"}`}
          title="Renderer status"
        />
      </header>

      <div className={`notice ${notice.tone}`}>{notice.message}</div>

      <section>
        <h2>Quick Actions</h2>
        <div className="button-grid">
          {FRAME_GATE_PRESETS.map((preset) => (
            <sp-button
              key={preset.id}
              variant={preset.id === "throttle-both" ? "accent" : "secondary"}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const count = await applyEffectPreset(preset);
                  setNotice({
                    tone: "success",
                    message: `${preset.name} applied to ${count} clip(s).`,
                  });
                })
              }
            >
              {preset.name}
            </sp-button>
          ))}
        </div>
      </section>

      <section>
        <h2>Effects</h2>
        <input
          className="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search MoneyMoves effects"
        />
        <div className="effect-list">
          {filteredEffects.map(([name, matchName]) => (
            <div className="effect-row" key={matchName}>
              <span>{name}</span>
              <div>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const count = await applyEffect(matchName, name);
                      setNotice({
                        tone: "success",
                        message: `${name} applied to ${count} clip(s).`,
                      });
                    })
                  }
                >
                  Apply
                </button>
                <button
                  className="quiet"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const count = await removeEffect(matchName, name);
                      setNotice({
                        tone: "success",
                        message: `${name} removed from ${count} clip(s).`,
                      });
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Palette</h2>
        <select
          value={paletteId}
          onChange={(event) => setPaletteId(event.target.value)}
        >
          {brandTokens.palettes.map((palette) => (
            <option value={palette.id} key={palette.id}>
              {palette.name}
            </option>
          ))}
        </select>
        <div className="swatches">
          {brandTokens.palettes
            .find((palette) => palette.id === paletteId)
            ?.colors.map((color) => (
              <span
                key={color}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
        </div>
      </section>

      <section>
        <h2>Output</h2>
        <div className="field-grid">
          <label>
            Width
            <input
              type="number"
              min="320"
              max="7680"
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
            />
          </label>
          <label>
            Height
            <input
              type="number"
              min="180"
              max="4320"
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
            />
          </label>
          <label>
            FPS
            <input
              type="number"
              min="1"
              max="120"
              step="0.001"
              value={fps}
              onChange={(event) => setFps(Number(event.target.value))}
            />
          </label>
        </div>
        <p className="hint">
          Match the active sequence. Automatic 25.6 sequence-rate discovery is
          pending host validation.
        </p>
      </section>

      <section>
        <h2>ASCII Title</h2>
        <label>
          Text
          <textarea
            value={asciiText}
            onChange={(event) => setAsciiText(event.target.value)}
            maxLength={160}
          />
        </label>
        <div className="field-grid two">
          <label>
            FIGlet style
            <select
              value={asciiFont}
              onChange={(event) =>
                setAsciiFont(event.target.value as AsciiTitleJobRequest["font"])
              }
            >
              {(["Standard", "Slant", "Big", "Small", "Block"] as const).map(
                (font) => (
                  <option key={font}>{font}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Animation
            <select
              value={asciiAnimation}
              onChange={(event) =>
                setAsciiAnimation(
                  event.target.value as AsciiTitleJobRequest["animation"],
                )
              }
            >
              {(["static", "reveal", "flicker", "scramble"] as const).map(
                (animation) => (
                  <option key={animation}>{animation}</option>
                ),
              )}
            </select>
          </label>
        </div>
        <sp-button
          variant="accent"
          disabled={busy || !rendererOnline || mapCountries.length === 0}
          onClick={() =>
            void run(() =>
              renderAndImport({
                schemaVersion: SCHEMA_VERSION,
                kind: "ascii-title",
                text: asciiText,
                font: asciiFont,
                animation: asciiAnimation,
                paletteId,
                width,
                height,
                fps,
                durationSeconds: 3,
                outputName: "moneymoves-ascii.mov",
              }),
            )
          }
        >
          Render &amp; Import
        </sp-button>
      </section>

      <section>
        <h2>Map</h2>
        <label>
          Country codes (ISO-3, comma separated)
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value.toUpperCase())}
          />
        </label>
        <div className="field-grid two">
          <label>
            Animation
            <select
              value={mapAnimation}
              onChange={(event) =>
                setMapAnimation(
                  event.target.value as MapJobRequest["animation"],
                )
              }
            >
              {(
                [
                  "fly-to",
                  "pan-between",
                  "border-draw",
                  "fill-reveal",
                  "pulse-highlight",
                ] as const
              ).map((animation) => (
                <option key={animation}>{animation}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={labels}
              onChange={(event) => setLabels(event.target.checked)}
            />{" "}
            Labels
          </label>
        </div>
        <sp-button
          variant="accent"
          disabled={busy || !rendererOnline}
          onClick={() =>
            void run(() =>
              renderAndImport({
                schemaVersion: SCHEMA_VERSION,
                kind: "map",
                countries: mapCountries,
                animation: mapAnimation,
                projection: "natural-earth",
                labels,
                transparent: true,
                paletteId,
                width,
                height,
                fps,
                durationSeconds: 5,
                outputName: `moneymoves-map-${mapCountries.join("-").toLowerCase()}.mov`,
              }),
            )
          }
        >
          Render &amp; Import
        </sp-button>
      </section>

      <section>
        <h2>Graphics</h2>
        <p className="hint">
          Insert a generated MoneyMoves MOGRT at the playhead. Its data remains
          editable in Premiere Properties.
        </p>
        <sp-button
          variant="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const path = await chooseAndInsertMogrt();
              setNotice({ tone: "success", message: `Inserted ${path}` });
            })
          }
        >
          Choose &amp; Insert MOGRT
        </sp-button>
      </section>

      {jobs.length > 0 && (
        <section>
          <h2>Render Queue</h2>
          {jobs.map((job) => (
            <div className="job" key={job.id}>
              <span>{job.kind}</span>
              <span>{job.state}</span>
              <span>{Math.round(job.progress * 100)}%</span>
              {(job.state === "queued" || job.state === "running") && (
                <button
                  className="quiet"
                  onClick={() => void cancelRenderJob(job.id)}
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      <section>
        <h2>Diagnostics</h2>
        <dl>
          {Object.entries(diagnostics).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div>
            <dt>renderer</dt>
            <dd>{rendererOnline ? "Online" : "Offline"}</dd>
          </div>
        </dl>
        <label>
          Renderer token
          <input
            value={token}
            type="password"
            onChange={(event) => setToken(event.target.value)}
          />
        </label>
        <div className="actions">
          <button
            onClick={() => {
              setRendererToken(token);
              void refreshDiagnostics();
            }}
          >
            Save token
          </button>
          <button className="quiet" onClick={() => void refreshDiagnostics()}>
            Refresh
          </button>
        </div>
      </section>
    </main>
  );
}
