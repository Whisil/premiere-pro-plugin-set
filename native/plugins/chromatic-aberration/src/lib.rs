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
        #[slider(label = "Amount", range = 0..=200, slider_range = 0..=60, default = 18, precision = 1)]
        Amount,
        #[slider(label = "Center X", range = 0..=1, default = 0.5, percent, precision = 1)]
        CenterX,
        #[slider(label = "Center Y", range = 0..=1, default = 0.5, percent, precision = 1)]
        CenterY,
        #[slider(label = "Falloff", range = 0.1..=4, slider_range = 0.1..=3, default = 1.25, precision = 2)]
        Falloff,
        #[popup(label = "Edges", options = ["Clamp", "Mirror", "Wrap"], default = 1)]
        EdgeBehavior,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)]
        Mix,
    }
}

prgpu::kernel! {
    chromatic_aberration {
        amount: f32 = Amount,
        center_x: f32 = CenterX,
        center_y: f32 = CenterY,
        falloff: f32 = Falloff,
        edge_behavior: u32 = EdgeBehavior,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesChromaticAberration;

impl Effect for MoneyMovesChromaticAberration {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves Chromatic Aberration";
        descriptor
            .about("MoneyMoves Chromatic Aberration — radial RGB lens separation")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(chromatic_aberration::kernel());
    }
}

prgpu::register_effect!(MoneyMovesChromaticAberration);
