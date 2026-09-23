#!/bin/bash

set -u

repo_root="$(cd "$(dirname "$0")" && pwd)"
panel_installer="$repo_root/scripts/reinstall-panel.sh"
native_installer="$repo_root/scripts/install-native-release.sh"

printf '\nMoneyMoves Toolkit offline installer\n'
printf '====================================\n\n'
printf 'This installer does not use Creative Cloud or UXP Developer Tool.\n'
printf 'It will ask for your Mac administrator password.\n\n'

premiere_pattern='.app/Contents/MacOS/Adobe Premiere Pro'
while /usr/bin/pgrep -if "$premiere_pattern" >/dev/null 2>&1 ||
  /usr/bin/pgrep -if 'UXP Developer Tool' >/dev/null 2>&1; do
  printf 'Save your work, then fully quit Premiere Pro and UXP Developer Tool.\n'
  printf 'Closing the Premiere window is not enough; choose Premiere Pro -> Quit.\n'
  printf 'When both apps are closed, press Return to continue...'
  if ! read -r _; then
    printf '\nNo input was available. Installation did not start.\n' >&2
    exit 20
  fi
done

if [[ ! -x "$panel_installer" || ! -x "$native_installer" ]]; then
  printf 'An installer helper is missing or not executable:\n%s\n%s\n' \
    "$panel_installer" "$native_installer" >&2
  exit_code=1
elif "$native_installer" --verify-only &&
  "$panel_installer" &&
  "$native_installer"; then
  printf '\nPanel and all native effects are installed. Reopen Premiere Pro and choose:\n'
  printf 'Window -> UXP Plugins -> MoneyMoves Toolkit\n'
  exit_code=0
else
  exit_code=$?
  printf '\nInstallation did not complete. Read the message above.\n' >&2
  if [[ "$exit_code" -eq 20 ]]; then
    printf 'If Premiere or UXP Developer Tool is open, quit it and run this installer again.\n' >&2
  fi
fi

printf '\nPress Return to close this window...'
read -r _
exit "$exit_code"
