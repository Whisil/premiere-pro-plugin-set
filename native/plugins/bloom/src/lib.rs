#![allow(
    dead_code,
    non_snake_case,
    clippy::drop_non_drop,
    clippy::question_mark
)]

use after_effects as ae;
use prgpu::prelude::*;

prgpu::params! {
    pub enum Params {
        #[slider(label = "Threshold", range = 0..=2, default = 0.7, precision = 2)]
        Threshold,
        #[slider(label = "Knee", range = 0..=1, default = 0.2, precision = 2)]
        Knee,
        #[slider(label = "Radius", range = 0..=128, slider_range = 0..=64, default = 20, precision = 1)]
        Radius,
        #[slider(label = "Intensity", range = 0..=4, slider_range = 0..=2, default = 0.8, precision = 2)]
        Intensity,
        #[color(label = "Tint", default = "#FFE6CC")]
        Tint,
        #[popup(label = "Quality", options = ["Draft", "Standard", "High"], default = 2)]
        Quality,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)]
        Mix,
    }
}

prgpu::kernel! {
    bloom {
        threshold: f32 = Threshold,
        knee: f32 = Knee,
        radius: f32 = Radius,
        intensity: f32 = Intensity,
        tint: [f32; 4] = Tint,
        quality: u32 = Quality,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesBloom;

impl Effect for MoneyMovesBloom {
    type Params = Params;
    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves Bloom";
        descriptor
            .about("MoneyMoves Bloom — thresholded tinted highlight glow")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }
    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(bloom::kernel());
    }
}

prgpu::register_effect!(MoneyMovesBloom);
