set dotenv-load := false

plugin_name := "MoneyMoves RGB Shift"
binary_name := "moneymoves_rgb_shift"
pipl_stem := "moneymoves-rgb-shift"
bundle_id := "com.moneymoves.rgb-shift"
target_dir := env_var_or_default("CARGO_TARGET_DIR", "target")

default:
    @just --list

native-validate:
    ./scripts/validate-native-toolchain.sh

native-rgb-build: native-validate
    cargo build -p moneymoves-rgb-shift --target aarch64-apple-darwin
    just native-rgb-bundle debug

native-rgb-release: native-validate
    cargo build -p moneymoves-rgb-shift --release --target aarch64-apple-darwin
    just native-rgb-bundle release

native-rgb-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/{{plugin_name}}.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/lib{{binary_name}}.dylib" "$bundle/Contents/MacOS/{{plugin_name}}"
    cp "$artifact_dir/{{pipl_stem}}.rsrc" "$bundle/Contents/Resources/{{plugin_name}}.rsrc"
    cp "$artifact_dir/{{pipl_stem}}_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/{{pipl_stem}}_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier {{bundle_id}}' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-rgb-install: native-rgb-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/{{plugin_name}}.plugin"
