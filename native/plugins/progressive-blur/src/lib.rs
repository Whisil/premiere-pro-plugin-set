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
        #[slider(label = "Strength", range = 0..=128, slider_range = 0..=64, default = 24, precision = 1)]
        Strength,
        #[angle(label = "Direction", default = 90)]
        Direction,
        #[slider(label = "Start", range = 0..=1, default = 0.2, percent, precision = 1)]
        Start,
        #[slider(label = "End", range = 0..=1, default = 0.8, percent, precision = 1)]
        End,
        #[slider(label = "Feather", range = 0..=1, default = 1, percent, precision = 1)]
        Feather,
        #[checkbox(label = "Invert", default = false)]
        Invert,
        #[popup(label = "Quality", options = ["Draft", "Standard", "High"], default = 2)]
        Quality,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)]
        Mix,
    }
}

prgpu::kernel! {
    progressive_blur {
        strength: f32 = Strength,
        direction_degrees: f32 = Direction,
        start: f32 = Start,
        end: f32 = End,
        feather: f32 = Feather,
        invert: bool = Invert,
        quality: u32 = Quality,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesProgressiveBlur;

impl Effect for MoneyMovesProgressiveBlur {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves Progressive Blur";
        descriptor
            .about("MoneyMoves Progressive Blur — directional gradient-masked blur")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(progressive_blur::kernel());
    }
}

prgpu::register_effect!(MoneyMovesProgressiveBlur);
