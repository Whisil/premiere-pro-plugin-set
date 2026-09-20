#!/bin/bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(node -p "require('$repo_root/apps/panel/package.json').version")"
ccx="$repo_root/artifacts/releases/MoneyMoves-Toolkit-$version.ccx"
system_plugins="/Library/Application Support/Adobe/UXP/Plugins/External"
registry_dir="/Library/Application Support/Adobe/UXP/PluginsInfo/v1"
registry="$registry_dir/premierepro.json"
plugin_storage="$HOME/Library/Application Support/Adobe/UXP/PluginsStorage/PPRO"
plugin_id="com.moneymoves.premiere-toolkit"
target="$system_plugins/${plugin_id}_$version"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_root="$repo_root/artifacts/install-backups/moneymoves-panel-$timestamp"
stage="$(mktemp -d "${TMPDIR:-/tmp}/moneymoves-panel-stage.XXXXXX")"
registry_stage="$(mktemp -d "${TMPDIR:-/tmp}/moneymoves-panel-registry.XXXXXX")"

cleanup() {
  rm -rf "$stage" "$registry_stage"
}

trap cleanup EXIT

sudo_cmd() {
  if [[ -n "${SUDO_ASKPASS:-}" ]]; then
    sudo -A "$@"
  else
    sudo "$@"
  fi
}

check_closed() {
  local label="$1"
  local pattern="$2"
  local status

  if pgrep -if "$pattern" >/dev/null 2>&1; then
    echo "Quit $label first, then run this again." >&2
    exit 20
  else
    status=$?
    if [[ "$status" -ne 1 ]]; then
      echo "Unable to verify whether $label is running; no installation changes were made." >&2
      exit 21
    fi
  fi
}

check_closed "Premiere Pro" 'Adobe Premiere Pro 2025.app/Contents/MacOS/Adobe Premiere Pro 2025'
check_closed "UXP Developer Tool" 'UXP Developer Tool'

"$repo_root/scripts/package-panel.sh"

if [[ ! -f "$ccx" ]]; then
  echo "Panel package was not created at $ccx" >&2
  exit 1
fi

echo "Verifying and unpacking $ccx ..."
(
  cd "$(dirname "$ccx")"
  /usr/bin/shasum -a 256 -c "$(basename "$ccx").sha256"
)
/usr/bin/ditto -x -k "$ccx" "$stage"

if [[ ! -f "$stage/manifest.json" || ! -f "$stage/index.html" ]]; then
  echo "The packaged panel is missing manifest.json or index.html." >&2
  exit 1
fi

if ! /usr/bin/grep -q 'id="root"' "$stage/index.html"; then
  echo "The packaged panel does not contain the application root." >&2
  exit 1
fi

mkdir -p "$backup_root/system" "$backup_root/storage"

echo "Backing up installed MoneyMoves panel copies..."
while IFS= read -r installed; do
  [[ -z "$installed" ]] && continue

  installed_name="$(basename "$installed")"
  if [[ "$installed" != "$system_plugins/"* || "$installed_name" != "${plugin_id}_"* ]]; then
    echo "Refusing to move unexpected path: $installed" >&2
    exit 1
  fi

  sudo_cmd /bin/mv "$installed" "$backup_root/system/$installed_name"
done < <(/usr/bin/find "$system_plugins" -mindepth 1 -maxdepth 1 -type d -name "${plugin_id}_*" -print 2>/dev/null)

if [[ -d "$plugin_storage" ]]; then
  while IFS= read -r stored; do
    [[ -z "$stored" ]] && continue

    if [[ "$stored" != "$plugin_storage/"*/Developer/"$plugin_id" && "$stored" != "$plugin_storage/"*/External/"$plugin_id" ]]; then
      echo "Refusing to move unexpected storage path: $stored" >&2
      exit 1
    fi

    relative="${stored#"$plugin_storage/"}"
    destination="$backup_root/storage/$relative"
    mkdir -p "$(dirname "$destination")"
    /bin/mv "$stored" "$destination"
  done < <(/usr/bin/find "$plugin_storage" -mindepth 3 -maxdepth 3 -type d -name "$plugin_id" -print 2>/dev/null)
fi

registry_source="$registry"
if [[ ! -f "$registry_source" ]]; then
  registry_source="$registry_stage/empty.json"
  printf '{"plugins":[]}\n' > "$registry_source"
fi

registry_output="$registry_stage/premierepro.json"
node "$repo_root/scripts/update-uxp-registry.mjs" "$registry_source" "$registry_output" "$version"

echo "Installing MoneyMoves Toolkit $version (admin password may be required)..."
sudo_cmd /bin/mkdir -p "$system_plugins" "$registry_dir"
sudo_cmd /usr/bin/ditto "$stage" "$target"
sudo_cmd /usr/bin/install -m 644 "$registry_output" "$registry"

if ! /usr/bin/cmp -s "$stage/index.html" "$target/index.html"; then
  echo "Installed index.html does not match the verified package." >&2
  exit 1
fi

echo "Installed: $target"
echo "Previous copies and plugin storage were preserved at: $backup_root"
echo "Reopen Premiere Pro, then choose Window → UXP Plugins → MoneyMoves Toolkit."
