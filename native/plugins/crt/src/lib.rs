#![allow(
    dead_code,
    non_snake_case,
    clippy::drop_non_drop,
    clippy::needless_update,
    clippy::question_mark
)]

use after_effects as ae;
use prgpu::prelude::*;

prgpu::params! {
    pub enum Params {
        #[slider(label = "Curvature", range = 0..=0.5, default = 0.12, percent, precision = 1)]
        Curvature,
        #[slider(label = "Scanlines", range = 0..=1, default = 0.35, percent, precision = 1)]
        Scanlines,
        #[slider(label = "Phosphor Mask", range = 0..=1, default = 0.25, percent, precision = 1)]
        PhosphorMask,
        #[slider(label = "Convergence", range = 0..=12, slider_range = 0..=6, default = 1.5, precision = 1)]
        Convergence,
        #[slider(label = "Noise", range = 0..=1, default = 0.06, percent, precision = 1)]
        Noise,
        #[slider(label = "Flicker", range = 0..=1, default = 0.08, percent, precision = 1)]
        Flicker,
        #[slider(label = "Vignette", range = 0..=1, default = 0.4, percent, precision = 1)]
        Vignette,
        #[slider(label = "Bloom", range = 0..=2, slider_range = 0..=1, default = 0.25, precision = 2)]
        Bloom,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)]
        Mix,
    }
}

prgpu::kernel! {
    crt {
        curvature: f32 = Curvature,
        scanlines: f32 = Scanlines,
        phosphor_mask: f32 = PhosphorMask,
        convergence: f32 = Convergence,
        noise_amount: f32 = Noise,
        flicker: f32 = Flicker,
        vignette: f32 = Vignette,
        bloom: f32 = Bloom,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesCrt;

impl Effect for MoneyMovesCrt {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves CRT";
        descriptor
            .about("MoneyMoves CRT — curved phosphor display, scanlines, grain, and glow")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(crt::kernel());
    }
}

prgpu::register_effect!(MoneyMovesCrt);
