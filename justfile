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

native-frame-build: native-validate
    cargo build -p moneymoves-frame-gate --target aarch64-apple-darwin
    just native-frame-bundle debug

native-frame-release: native-validate
    cargo build -p moneymoves-frame-gate --release --target aarch64-apple-darwin
    just native-frame-bundle release

native-frame-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves Frame Gate.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_frame_gate.dylib" "$bundle/Contents/MacOS/MoneyMoves Frame Gate"
    cp "$artifact_dir/moneymoves-frame-gate.rsrc" "$bundle/Contents/Resources/MoneyMoves Frame Gate.rsrc"
    cp "$artifact_dir/moneymoves-frame-gate_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-frame-gate_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.frame-gate' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-frame-install: native-frame-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves Frame Gate.plugin"

native-halftone-build: native-validate
    cargo build -p moneymoves-halftone --target aarch64-apple-darwin
    just native-halftone-bundle debug

native-halftone-release: native-validate
    cargo build -p moneymoves-halftone --release --target aarch64-apple-darwin
    just native-halftone-bundle release

native-halftone-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves Halftone.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_halftone.dylib" "$bundle/Contents/MacOS/MoneyMoves Halftone"
    cp "$artifact_dir/moneymoves-halftone.rsrc" "$bundle/Contents/Resources/MoneyMoves Halftone.rsrc"
    cp "$artifact_dir/moneymoves-halftone_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-halftone_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.halftone' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-halftone-install: native-halftone-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves Halftone.plugin"

native-dot-matrix-build: native-validate
    cargo build -p moneymoves-dot-matrix --target aarch64-apple-darwin
    just native-dot-matrix-bundle debug

native-dot-matrix-release: native-validate
    cargo build -p moneymoves-dot-matrix --release --target aarch64-apple-darwin
    just native-dot-matrix-bundle release

native-dot-matrix-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves Dot Matrix.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_dot_matrix.dylib" "$bundle/Contents/MacOS/MoneyMoves Dot Matrix"
    cp "$artifact_dir/moneymoves-dot-matrix.rsrc" "$bundle/Contents/Resources/MoneyMoves Dot Matrix.rsrc"
    cp "$artifact_dir/moneymoves-dot-matrix_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-dot-matrix_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.dot-matrix' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-dot-matrix-install: native-dot-matrix-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves Dot Matrix.plugin"
