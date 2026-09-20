import { readFile, writeFile } from "node:fs/promises";

const [source, output, version] = process.argv.slice(2);

if (!source || !output || !version) {
  throw new Error(
    "Usage: node update-uxp-registry.mjs <source> <output> <version>",
  );
}

const pluginId = "com.moneymoves.premiere-toolkit";
const pluginPath =
  "/Library/Application Support/Adobe/UXP/Plugins/External/" +
  `${pluginId}_${version}`;
const registry = JSON.parse(await readFile(source, "utf8"));
const plugins = Array.isArray(registry.plugins) ? registry.plugins : [];

registry.plugins = plugins
  .filter((plugin) => plugin?.pluginId !== pluginId)
  .concat({
    hostMinVersion: "25.6.0",
    name: "MoneyMoves Toolkit",
    path: pluginPath,
    pluginId,
    status: "enabled",
    type: "uxp",
    versionString: version,
  });

await writeFile(output, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
