#!/bin/bash

set -u

repo_root="$(cd "$(dirname "$0")" && pwd)"
installer="$repo_root/scripts/reinstall-panel.sh"

printf '\nMoneyMoves Toolkit offline installer\n'
printf '====================================\n\n'
printf 'This installer does not use Creative Cloud or UXP Developer Tool.\n'
printf 'It will ask for your Mac administrator password.\n\n'

if [[ ! -x "$installer" ]]; then
  printf 'Installer helper is missing or not executable:\n%s\n' "$installer" >&2
  exit_code=1
elif "$installer"; then
  printf '\nInstallation complete. Reopen Premiere Pro and choose:\n'
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
