#!/bin/bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(node -p "require('$repo_root/package.json').version")"
mode="${1:-install}"
archive_name="MoneyMoves-Native-Effects-$version"
archive="$repo_root/artifacts/releases/$archive_name.zip"
destination_root="$HOME/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_root="$repo_root/artifacts/install-backups/moneymoves-native-$timestamp"
stage="$(mktemp -d "${TMPDIR:-/tmp}/moneymoves-native-install.XXXXXX")"
mutation_started=0
install_complete=0
installed_paths=()
backed_up_names=()

cleanup() {
  exit_status=$?
  set +u
  if [[ "$mutation_started" -eq 1 && "$install_complete" -eq 0 ]]; then
    echo "Native installation failed; restoring the previous bundles." >&2
    for installed_path in "${installed_paths[@]}"; do
      if [[ -d "$installed_path" ]]; then
        /bin/rm -rf "$installed_path"
      fi
    done
    for bundle_name in "${backed_up_names[@]}"; do
      if [[ -d "$backup_root/$bundle_name" ]]; then
        /bin/mv "$backup_root/$bundle_name" "$destination_root/$bundle_name"
      fi
    done
  fi
  rm -rf "$stage"
  exit "$exit_status"
}
trap cleanup EXIT

if [[ "$mode" != "install" && "$mode" != "--verify-only" ]]; then
  echo "Usage: $0 [--verify-only]" >&2
  exit 64
fi

if [[ "$mode" == "install" ]]; then
  premiere_processes="$(/usr/bin/pgrep -ifl 'Adobe Premiere Pro' 2>/dev/null || true)"
  if /usr/bin/grep -Fq '.app/Contents/MacOS/Adobe Premiere Pro' <<<"$premiere_processes"; then
    echo "Quit Premiere Pro before installing native effects." >&2
    exit 20
  fi
fi

if [[ ! -f "$archive" || ! -f "$archive.sha256" ]]; then
  echo "Native release archive is missing: $archive" >&2
  exit 66
fi

(
  cd "$(dirname "$archive")"
  /usr/bin/shasum -a 256 -c "$(basename "$archive").sha256"
)
/usr/bin/ditto -x -k "$archive" "$stage"
source_root="$stage/$archive_name"

if [[ ! -f "$source_root/manifest.json" ]]; then
  echo "Native release manifest is missing." >&2
  exit 66
fi

bundles=()
while IFS= read -r bundle_name; do
  bundles+=("$bundle_name")
done < <(node -e '
  const manifest = require(process.argv[1]);
  const expectedVersion = process.argv[2];
  const expected = [
    ["MoneyMoves Frame Gate.plugin", "com.moneymoves.frame-gate"],
    ["MoneyMoves RGB Shift.plugin", "com.moneymoves.rgb-shift"],
    ["MoneyMoves Halftone.plugin", "com.moneymoves.halftone"],
    ["MoneyMoves Dot Matrix.plugin", "com.moneymoves.dot-matrix"],
    ["MoneyMoves 8-bit.plugin", "com.moneymoves.eight-bit"],
    ["MoneyMoves Dither.plugin", "com.moneymoves.dither"],
    ["MoneyMoves Chromatic Aberration.plugin", "com.moneymoves.chromatic-aberration"],
    ["MoneyMoves Barrel Blur.plugin", "com.moneymoves.barrel-blur"],
    ["MoneyMoves Bloom.plugin", "com.moneymoves.bloom"],
    ["MoneyMoves Progressive Blur.plugin", "com.moneymoves.progressive-blur"],
    ["MoneyMoves CRT.plugin", "com.moneymoves.crt"],
    ["MoneyMoves ASCII.plugin", "com.moneymoves.ascii"],
  ];
  if (
    manifest.schemaVersion !== 1 ||
    manifest.version !== expectedVersion ||
    manifest.platform !== "macos-arm64" ||
    !Array.isArray(manifest.effects) ||
    JSON.stringify(manifest.effects.map(({ bundle, matchName }) => [bundle, matchName])) !==
      JSON.stringify(expected)
  ) process.exit(65);
  for (const effect of manifest.effects) console.log(effect.bundle);
' "$source_root/manifest.json" "$version")

if [[ "${#bundles[@]}" -ne 12 ]]; then
  echo "Native release manifest does not contain the expected bundle inventory." >&2
  exit 65
fi

for bundle_name in "${bundles[@]}"; do
  source_bundle="$source_root/$bundle_name"
  executable_name="${bundle_name%.plugin}"
  executable="$source_bundle/Contents/MacOS/$executable_name"
  if [[ ! -d "$source_bundle" || ! -x "$executable" ]]; then
    echo "Invalid native release bundle: $bundle_name" >&2
    exit 66
  fi
  /usr/bin/codesign --verify --deep --strict "$source_bundle"
  /usr/bin/file "$executable" | /usr/bin/grep -q 'arm64'
done

if [[ "$mode" == "--verify-only" ]]; then
  echo "Verified ${#bundles[@]} signed native effects in: $archive"
  exit 0
fi

mkdir -p "$destination_root" "$backup_root"
mutation_started=1

for bundle_name in "${bundles[@]}"; do
  installed="$destination_root/$bundle_name"
  if [[ -d "$installed" ]]; then
    /bin/mv "$installed" "$backup_root/$bundle_name"
    backed_up_names+=("$bundle_name")
  fi
  installed_paths+=("$installed")
  /usr/bin/ditto "$source_root/$bundle_name" "$installed"
  /usr/bin/codesign --verify --deep --strict "$installed"
done

install_complete=1
echo "Installed ${#bundles[@]} signed native effects into: $destination_root"
echo "Previous matching bundles were preserved at: $backup_root"
