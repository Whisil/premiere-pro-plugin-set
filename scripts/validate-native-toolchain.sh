#!/bin/zsh
set -euo pipefail

: "${AESDK_ROOT:=/Users/davidgajdamaka/Developer/AdobeSDKs/AfterEffectsSDK}"
: "${PRSDK_ROOT:=/Users/davidgajdamaka/Desktop/code/premiere-editor-tools/Premiere Pro 26.0 C++ SDK}"

required_files=(
  "$AESDK_ROOT/Examples/Headers/AE_Effect.h"
  "$AESDK_ROOT/Examples/Headers/AE_EffectVers.h"
  "$PRSDK_ROOT/Examples/Headers/PrSDKGPUFilter.h"
)

for required_file in "${required_files[@]}"; do
  if [[ ! -f "$required_file" ]]; then
    print -u2 "Missing native SDK file: $required_file"
    exit 66
  fi
done

if [[ "$(uname -m)" != "arm64" ]]; then
  print -u2 "Native development target must be Apple Silicon (arm64)."
  exit 69
fi

for command_name in cargo rustc xcodebuild just codesign; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    print -u2 "Missing command: $command_name"
    exit 69
  fi
done

print "AE SDK: $AESDK_ROOT"
print "Premiere SDK: $PRSDK_ROOT"
print "Architecture: $(uname -m)"
print "Rust: $(rustc --version)"
print "Xcode: $(xcodebuild -version | head -n 1)"
print "Just: $(just --version)"
print "Native toolchain validation passed."
