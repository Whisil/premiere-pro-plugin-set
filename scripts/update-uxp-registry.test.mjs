import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const updater = join(scriptsDir, "update-uxp-registry.mjs");

test("writes Adobe's system plugin token and preserves unrelated entries", async () => {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "moneymoves-registry-test-"),
  );
  try {
    const source = join(temporaryDirectory, "source.json");
    const output = join(temporaryDirectory, "output.json");
    await writeFile(
      source,
      `${JSON.stringify({
        plugins: [
          {
            pluginId: "com.example.keep-me",
            path: "$systemPlugins/External/com.example.keep-me_1.0.0",
          },
          {
            pluginId: "com.moneymoves.premiere-toolkit",
            path: "$systemPlugins/External/com.moneymoves.premiere-toolkit_0.9.2",
          },
        ],
      })}\n`,
      "utf8",
    );

    const result = spawnSync(
      process.execPath,
      [updater, source, output, "0.12.2"],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);

    const registry = JSON.parse(await readFile(output, "utf8"));
    assert.deepEqual(registry.plugins, [
      {
        pluginId: "com.example.keep-me",
        path: "$systemPlugins/External/com.example.keep-me_1.0.0",
      },
      {
        hostMinVersion: "25.6.0",
        name: "MoneyMoves Toolkit",
        path: "$systemPlugins/External/com.moneymoves.premiere-toolkit_0.12.2",
        pluginId: "com.moneymoves.premiere-toolkit",
        status: "enabled",
        type: "uxp",
        versionString: "0.12.2",
      },
    ]);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
