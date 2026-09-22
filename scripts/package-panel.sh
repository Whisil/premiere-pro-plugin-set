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

for icon in plugin@1x.png plugin@2x.png panel@1x.png panel@2x.png; do
  if [[ ! -f "$dist_dir/icons/$icon" ]]; then
    echo "Panel package is missing required scaled icon: icons/$icon" >&2
    exit 1
  fi
done

html_file="$dist_dir/index.html"
grep_bin="/usr/bin/grep"

if "$grep_bin" -Eq 'type="module"|crossorigin' "$html_file"; then
  echo "Panel package is not UXP-compatible: index.html contains module-only attributes." >&2
  exit 1
fi

if "$grep_bin" -Eq 'display:grid|grid-template-' "$dist_dir/assets/index.js"; then
  echo "Panel package is not UXP-compatible: bundled CSS contains unsupported Grid layout." >&2
  exit 1
fi

if ! "$grep_bin" -Fq "entrypoints.setup" "$html_file"; then
  echo "Panel package is not UXP-compatible: inline entrypoints bootstrap is missing." >&2
  exit 1
fi

if ! "$grep_bin" -Fq '<script src="./assets/index.js"></script>' "$html_file"; then
  echo "Panel package is not UXP-compatible: classic script tag is missing." >&2
  exit 1
fi

root_line="$("$grep_bin" -n 'id="root"' "$html_file" | /usr/bin/head -n1 | /usr/bin/cut -d: -f1)"
setup_line="$("$grep_bin" -n 'entrypoints.setup' "$html_file" | /usr/bin/head -n1 | /usr/bin/cut -d: -f1)"
script_line="$("$grep_bin" -n '<script src="./assets/index.js"></script>' "$html_file" | /usr/bin/head -n1 | /usr/bin/cut -d: -f1)"
if [[ -z "$root_line" || -z "$setup_line" || -z "$script_line" ]]; then
  echo "Panel package is not UXP-compatible: bootstrap must wrap #root." >&2
  exit 1
fi
if [[ "$setup_line" -le "$root_line" || "$script_line" -le "$setup_line" ]]; then
  echo "Panel package is not UXP-compatible: bootstrap then bundle must load after #root." >&2
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
archive_entries="$(/usr/bin/unzip -Z1 "$artifact")"
if ! /usr/bin/grep -qx 'manifest.json' <<< "$archive_entries"; then
  echo "Invalid CCX layout: manifest.json must be at the archive root." >&2
  exit 1
fi

hash="$(/usr/bin/shasum -a 256 "$artifact" | awk '{print $1}')"
printf '%s  %s\n' "$hash" "$(basename "$artifact")" > "$checksum"

echo "Created $artifact"
echo "Checksum $checksum"
