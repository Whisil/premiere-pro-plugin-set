# Native effects

`core` contains deterministic CPU reference implementations and `shaderbench` provides a host-independent visual test loop. Frame Gate, RGB Shift, Halftone, Dot Matrix, and Dither have reference implementations; the pixel effects also have Slang kernels in `shaders` for the eventual `prgpu` dispatch path.

The Adobe bundle crate is deliberately gated until the proprietary After Effects and Premiere SDK headers have been downloaded and the Phase 0 host spike can validate exact API behavior. Do not invent or vendor Adobe headers. The intended pinned baseline is `after-effects = 0.4.0` and `prgpu/prgpu-build = 0.2.0`, with both the AE software renderer and `premiere::define_gpu_filter!` GPU entrypoint wired from the first host-loaded effect.

Run the reference harness:

```sh
cargo run -p shaderbench -- \
  --effect rgb-shift \
  --input test.png \
  --output shifted.png
```
