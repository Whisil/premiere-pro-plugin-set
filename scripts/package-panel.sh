#!/bin/bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
panel_dir="$repo_root/apps/panel"
dist_dir="$panel_dir/dist"
release_dir="$repo_root/artifacts/releases"
version="$(node -p "require('$panel_dir/package.json').version")"
artifact="$release_dir/MoneyMoves-Toolkit-$version.ccx"
checksum="$artifact.sha256"
stage_dir="$(mktemp -d "${TMPDIR:-/tmp}/moneymoves-ccx.XXXXXX")"

cleanup() {
  rm -rf "$stage_dir"
}
trap cleanup EXIT

cd "$repo_root"
CI=true pnpm --filter @moneymoves/contracts build
CI=true pnpm --filter @moneymoves/panel build

test -f "$dist_dir/manifest.json"
test -f "$dist_dir/index.html"
test -d "$dist_dir/assets"

if rg -q 'type="module"|crossorigin' "$dist_dir/index.html"; then
  echo "Panel package is not UXP-compatible: index.html contains module-only attributes." >&2
  exit 1
fi

if ! rg -q '<script src="\./assets/index\.js"></script>' "$dist_dir/index.html"; then
  echo "Panel package is not UXP-compatible: classic script tag is missing." >&2
  exit 1
fi

cp -R "$dist_dir/." "$stage_dir/"
mkdir -p "$release_dir"
rm -f "$artifact" "$checksum"

(
  cd "$stage_dir"
  /usr/bin/zip -qry "$artifact" .
)

/usr/bin/unzip -tq "$artifact"
if ! /usr/bin/unzip -Z1 "$artifact" | /usr/bin/grep -qx 'manifest.json'; then
  echo "Invalid CCX layout: manifest.json must be at the archive root." >&2
  exit 1
fi

hash="$(/usr/bin/shasum -a 256 "$artifact" | awk '{print $1}')"
printf '%s  %s\n' "$hash" "$(basename "$artifact")" > "$checksum"

echo "Created $artifact"
echo "Checksum $checksum"
