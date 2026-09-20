# Native effects

`core` contains deterministic CPU reference implementations and `shaderbench` provides a host-independent visual test loop. Frame Gate, RGB Shift, Halftone, Dot Matrix, Dither, Progressive Blur, CRT, and ASCII have reference implementations; the pixel effects also have Slang kernels in `shaders`.

`plugins/rgb-shift`, `plugins/frame-gate`, `plugins/halftone`, and `plugins/dot-matrix` are loadable Adobe bundles. They pin `exaecut-after-effects` and `exaecut-premiere` 0.5.0 with `prgpu` and `prgpu-build` 0.2.0. One declarative pipeline per effect supplies an AE-style CPU entry point and Premiere's additional Metal GPU entry point. Permanent match names use the `com.moneymoves.*` namespace; existing parameter indices remain stable as controls and presets are added.

Validate, build, package, sign, and install the Apple-Silicon development bundle:

```sh
just native-validate
just native-rgb-build
just native-rgb-install
just native-frame-install
just native-halftone-install
just native-dot-matrix-install
just native-progressive-blur-install
just native-crt-install
just native-ascii-install
```

The packaged artifact is `target/debug/MoneyMoves RGB Shift.plugin`. The install recipe copies it to the per-user MediaCore directory and applies an ad-hoc signature. Restart Premiere after every native bundle replacement.

Run the reference harness:

```sh
cargo run -p shaderbench -- \
  --effect rgb-shift \
  --input test.png \
  --output shifted.png
```
