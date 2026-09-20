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

native-eight-bit-build: native-validate
    cargo build -p moneymoves-eight-bit --target aarch64-apple-darwin
    just native-eight-bit-bundle debug

native-eight-bit-release: native-validate
    cargo build -p moneymoves-eight-bit --release --target aarch64-apple-darwin
    just native-eight-bit-bundle release

native-eight-bit-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves 8-bit.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_eight_bit.dylib" "$bundle/Contents/MacOS/MoneyMoves 8-bit"
    cp "$artifact_dir/moneymoves-eight-bit.rsrc" "$bundle/Contents/Resources/MoneyMoves 8-bit.rsrc"
    cp "$artifact_dir/moneymoves-eight-bit_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-eight-bit_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.eight-bit' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-eight-bit-install: native-eight-bit-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves 8-bit.plugin"

native-dither-build: native-validate
    cargo build -p moneymoves-dither --target aarch64-apple-darwin
    just native-dither-bundle debug

native-dither-release: native-validate
    cargo build -p moneymoves-dither --release --target aarch64-apple-darwin
    just native-dither-bundle release

native-dither-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves Dither.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_dither.dylib" "$bundle/Contents/MacOS/MoneyMoves Dither"
    cp "$artifact_dir/moneymoves-dither.rsrc" "$bundle/Contents/Resources/MoneyMoves Dither.rsrc"
    cp "$artifact_dir/moneymoves-dither_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-dither_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.dither' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-dither-install: native-dither-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves Dither.plugin"

native-chromatic-build: native-validate
    cargo build -p moneymoves-chromatic-aberration --target aarch64-apple-darwin
    just native-chromatic-bundle debug

native-chromatic-release: native-validate
    cargo build -p moneymoves-chromatic-aberration --release --target aarch64-apple-darwin
    just native-chromatic-bundle release

native-chromatic-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves Chromatic Aberration.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_chromatic_aberration.dylib" "$bundle/Contents/MacOS/MoneyMoves Chromatic Aberration"
    cp "$artifact_dir/moneymoves-chromatic-aberration.rsrc" "$bundle/Contents/Resources/MoneyMoves Chromatic Aberration.rsrc"
    cp "$artifact_dir/moneymoves-chromatic-aberration_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-chromatic-aberration_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.chromatic-aberration' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-chromatic-install: native-chromatic-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves Chromatic Aberration.plugin"

native-barrel-blur-build: native-validate
    cargo build -p moneymoves-barrel-blur --target aarch64-apple-darwin
    just native-barrel-blur-bundle debug

native-barrel-blur-release: native-validate
    cargo build -p moneymoves-barrel-blur --release --target aarch64-apple-darwin
    just native-barrel-blur-bundle release

native-barrel-blur-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves Barrel Blur.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_barrel_blur.dylib" "$bundle/Contents/MacOS/MoneyMoves Barrel Blur"
    cp "$artifact_dir/moneymoves-barrel-blur.rsrc" "$bundle/Contents/Resources/MoneyMoves Barrel Blur.rsrc"
    cp "$artifact_dir/moneymoves-barrel-blur_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-barrel-blur_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.barrel-blur' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-barrel-blur-install: native-barrel-blur-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves Barrel Blur.plugin"

native-bloom-build: native-validate
    cargo build -p moneymoves-bloom --target aarch64-apple-darwin
    just native-bloom-bundle debug

native-bloom-release: native-validate
    cargo build -p moneymoves-bloom --release --target aarch64-apple-darwin
    just native-bloom-bundle release

native-bloom-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves Bloom.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_bloom.dylib" "$bundle/Contents/MacOS/MoneyMoves Bloom"
    cp "$artifact_dir/moneymoves-bloom.rsrc" "$bundle/Contents/Resources/MoneyMoves Bloom.rsrc"
    cp "$artifact_dir/moneymoves-bloom_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-bloom_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.bloom' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-bloom-install: native-bloom-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves Bloom.plugin"

native-progressive-blur-build: native-validate
    cargo build -p moneymoves-progressive-blur --target aarch64-apple-darwin
    just native-progressive-blur-bundle debug

native-progressive-blur-release: native-validate
    cargo build -p moneymoves-progressive-blur --release --target aarch64-apple-darwin
    just native-progressive-blur-bundle release

native-progressive-blur-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves Progressive Blur.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_progressive_blur.dylib" "$bundle/Contents/MacOS/MoneyMoves Progressive Blur"
    cp "$artifact_dir/moneymoves-progressive-blur.rsrc" "$bundle/Contents/Resources/MoneyMoves Progressive Blur.rsrc"
    cp "$artifact_dir/moneymoves-progressive-blur_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-progressive-blur_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.progressive-blur' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-progressive-blur-install: native-progressive-blur-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves Progressive Blur.plugin"

native-crt-build: native-validate
    cargo build -p moneymoves-crt --target aarch64-apple-darwin
    just native-crt-bundle debug

native-crt-release: native-validate
    cargo build -p moneymoves-crt --release --target aarch64-apple-darwin
    just native-crt-bundle release

native-crt-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves CRT.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_crt.dylib" "$bundle/Contents/MacOS/MoneyMoves CRT"
    cp "$artifact_dir/moneymoves-crt.rsrc" "$bundle/Contents/Resources/MoneyMoves CRT.rsrc"
    cp "$artifact_dir/moneymoves-crt_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-crt_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.crt' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-crt-install: native-crt-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves CRT.plugin"

native-ascii-build: native-validate
    cargo build -p moneymoves-ascii --target aarch64-apple-darwin
    just native-ascii-bundle debug

native-ascii-release: native-validate
    cargo build -p moneymoves-ascii --release --target aarch64-apple-darwin
    just native-ascii-bundle release

native-ascii-bundle profile:
    #!/bin/zsh
    set -euo pipefail
    bundle="{{target_dir}}/{{profile}}/MoneyMoves ASCII.plugin"
    artifact_dir="{{target_dir}}/aarch64-apple-darwin/{{profile}}"
    rm -rf "$bundle"
    mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
    cp "$artifact_dir/libmoneymoves_ascii.dylib" "$bundle/Contents/MacOS/MoneyMoves ASCII"
    cp "$artifact_dir/moneymoves-ascii.rsrc" "$bundle/Contents/Resources/MoneyMoves ASCII.rsrc"
    cp "$artifact_dir/moneymoves-ascii_PkgInfo" "$bundle/Contents/PkgInfo"
    cp "$artifact_dir/moneymoves-ascii_Info.plist" "$bundle/Contents/Info.plist"
    /usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.moneymoves.ascii' "$bundle/Contents/Info.plist"
    codesign --force --deep --sign - "$bundle"
    codesign --verify --deep --strict "$bundle"
    print "Created $bundle"

native-ascii-install: native-ascii-build
    ./scripts/install-native-dev.sh "{{target_dir}}/debug/MoneyMoves ASCII.plugin"
