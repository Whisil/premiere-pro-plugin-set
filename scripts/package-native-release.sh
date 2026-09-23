#!/bin/bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(node -p "require('$repo_root/package.json').version")"
bundle_root="$repo_root/target/release"
release_dir="$repo_root/artifacts/releases"
archive_name="MoneyMoves-Native-Effects-$version"
stage="$(mktemp -d "${TMPDIR:-/tmp}/moneymoves-native-package.XXXXXX")"
stage_root="$stage/$archive_name"
archive="$release_dir/$archive_name.zip"

cleanup() {
  rm -rf "$stage"
}
trap cleanup EXIT

inventory=(
  "MoneyMoves Frame Gate.plugin|com.moneymoves.frame-gate"
  "MoneyMoves RGB Shift.plugin|com.moneymoves.rgb-shift"
  "MoneyMoves Halftone.plugin|com.moneymoves.halftone"
  "MoneyMoves Dot Matrix.plugin|com.moneymoves.dot-matrix"
  "MoneyMoves 8-bit.plugin|com.moneymoves.eight-bit"
  "MoneyMoves Dither.plugin|com.moneymoves.dither"
  "MoneyMoves Chromatic Aberration.plugin|com.moneymoves.chromatic-aberration"
  "MoneyMoves Barrel Blur.plugin|com.moneymoves.barrel-blur"
  "MoneyMoves Bloom.plugin|com.moneymoves.bloom"
  "MoneyMoves Progressive Blur.plugin|com.moneymoves.progressive-blur"
  "MoneyMoves CRT.plugin|com.moneymoves.crt"
  "MoneyMoves ASCII.plugin|com.moneymoves.ascii"
)

mkdir -p "$stage_root" "$release_dir"

for entry in "${inventory[@]}"; do
  bundle_name="${entry%%|*}"
  match_name="${entry#*|}"
  source_bundle="$bundle_root/$bundle_name"
  executable_name="${bundle_name%.plugin}"
  executable="$source_bundle/Contents/MacOS/$executable_name"
  resource="$source_bundle/Contents/Resources/$executable_name.rsrc"

  if [[ ! -d "$source_bundle" || ! -x "$executable" || ! -f "$resource" ]]; then
    echo "Missing release bundle content: $source_bundle" >&2
    exit 66
  fi
  /usr/bin/codesign --verify --deep --strict "$source_bundle"
  architecture="$(/usr/bin/file "$executable")"
  symbols="$(/usr/bin/nm -gU "$executable")"
  /usr/bin/grep -q 'arm64' <<<"$architecture"
  /usr/bin/grep -q '_EffectMain' <<<"$symbols"
  /usr/bin/grep -q '_xGPUFilterEntry' <<<"$symbols"
  /usr/bin/grep -aFq "$match_name" "$resource"
  /usr/bin/ditto "$source_bundle" "$stage_root/$bundle_name"
done

node - "$stage_root/manifest.json" "$version" "${inventory[@]}" <<'NODE'
const fs = require("fs");
const [output, version, ...entries] = process.argv.slice(2);
const effects = entries.map((entry) => {
  const [bundle, matchName] = entry.split("|");
  return { bundle, matchName };
});
fs.writeFileSync(
  output,
  `${JSON.stringify({ schemaVersion: 1, version, platform: "macos-arm64", effects }, null, 2)}\n`,
);
NODE

rm -f "$archive" "$archive.sha256"
/usr/bin/ditto -c -k --sequesterRsrc --keepParent "$stage_root" "$archive"
(
  cd "$release_dir"
  /usr/bin/shasum -a 256 "$(basename "$archive")" > "$(basename "$archive").sha256"
  /usr/bin/shasum -a 256 -c "$(basename "$archive").sha256"
)
/usr/bin/unzip -tq "$archive"

echo "Created $archive"
echo "Checksum $archive.sha256"
