#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
REPO_DIR="${SCRIPT_DIR:h}"
SERVICE_DIR="$REPO_DIR/services/render-service"
SERVER_PATH="$SERVICE_DIR/dist/server.js"
NODE_PATH="$(command -v node)"
FFMPEG_PATH="$(command -v ffmpeg)"
AGENT_DIR="$HOME/Library/LaunchAgents"
SUPPORT_DIR="$HOME/Library/Application Support/MoneyMoves"
LOG_DIR="$HOME/Library/Logs/MoneyMoves"
PLIST_PATH="$AGENT_DIR/com.moneymoves.renderer.plist"
USER_DOMAIN="gui/$(id -u)"

if [[ ! -f "$SERVER_PATH" ]]; then
  print -u2 "Renderer build missing. Run: pnpm build:renderer"
  exit 1
fi

mkdir -p "$AGENT_DIR" "$SUPPORT_DIR" "$LOG_DIR"
if [[ ! -f "$SUPPORT_DIR/renderer-token" ]]; then
  umask 077
  openssl rand -hex 32 > "$SUPPORT_DIR/renderer-token"
fi

sed \
  -e "s|__NODE__|$NODE_PATH|g" \
  -e "s|__SERVER__|$SERVER_PATH|g" \
  -e "s|__FFMPEG__|$FFMPEG_PATH|g" \
  -e "s|__WORKDIR__|$SERVICE_DIR|g" \
  -e "s|__LOGDIR__|$LOG_DIR|g" \
  "$SCRIPT_DIR/com.moneymoves.renderer.plist" > "$PLIST_PATH"

plutil -lint "$PLIST_PATH"
launchctl bootout "$USER_DOMAIN" "$PLIST_PATH" 2>/dev/null || true
launchctl bootstrap "$USER_DOMAIN" "$PLIST_PATH"
launchctl kickstart -k "$USER_DOMAIN/com.moneymoves.renderer"

print "MoneyMoves renderer installed."
print "Token: $SUPPORT_DIR/renderer-token"
print "Logs:  $LOG_DIR"

