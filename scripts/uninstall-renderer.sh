#!/bin/zsh
set -euo pipefail

PLIST_PATH="$HOME/Library/LaunchAgents/com.moneymoves.renderer.plist"
USER_DOMAIN="gui/$(id -u)"

if [[ -f "$PLIST_PATH" ]]; then
  launchctl bootout "$USER_DOMAIN" "$PLIST_PATH" 2>/dev/null || true
  rm "$PLIST_PATH"
fi

print "MoneyMoves renderer unloaded. Generated media, logs, and token were retained."

