# Native effects

`core` contains deterministic CPU reference implementations and `shaderbench` provides a host-independent visual test loop. Frame Gate, RGB Shift, Halftone, Dot Matrix, and Dither have reference implementations; the pixel effects also have Slang kernels in `shaders`.

`plugins/rgb-shift` is the first loadable Adobe bundle. It pins `exaecut-after-effects` and `exaecut-premiere` 0.5.0 with `prgpu` and `prgpu-build` 0.2.0. One declarative pipeline supplies an AE-style CPU entry point and Premiere's additional Metal GPU entry point. Its permanent match name is `com.moneymoves.rgb-shift`; existing parameter indices remain stable as edge sampling and presets are added.

Validate, build, package, sign, and install the Apple-Silicon development bundle:

```sh
just native-validate
just native-rgb-build
just native-rgb-install
```

The packaged artifact is `target/debug/MoneyMoves RGB Shift.plugin`. The install recipe copies it to the per-user MediaCore directory and applies an ad-hoc signature. Restart Premiere after every native bundle replacement.

Run the reference harness:

```sh
cargo run -p shaderbench -- \
  --effect rgb-shift \
  --input test.png \
  --output shifted.png
```
