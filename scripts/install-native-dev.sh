#!/bin/zsh
set -euo pipefail

if [[ $# -ne 1 ]]; then
  print -u2 "Usage: scripts/install-native-dev.sh path/to/MoneyMoves.plugin"
  exit 64
fi

SOURCE_BUNDLE="${1:A}"
if [[ ! -d "$SOURCE_BUNDLE" || "$SOURCE_BUNDLE" != *.plugin ]]; then
  print -u2 "Expected an existing .plugin bundle."
  exit 66
fi

DESTINATION_DIR="$HOME/Library/Application Support/Adobe/Common/Plug-ins/7.0/MediaCore"
DESTINATION_BUNDLE="$DESTINATION_DIR/${SOURCE_BUNDLE:t}"
mkdir -p "$DESTINATION_DIR"
ditto "$SOURCE_BUNDLE" "$DESTINATION_BUNDLE"
codesign --force --deep --sign - "$DESTINATION_BUNDLE"
codesign --verify --deep --strict "$DESTINATION_BUNDLE"
print "Installed and ad-hoc signed: $DESTINATION_BUNDLE"

