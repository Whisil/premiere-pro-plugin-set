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
        #[slider(label = "Spacing", range = 1..=256, slider_range = 2..=64, default = 9, precision = 1)]
        Spacing,
        #[slider(label = "Dot Size", range = 0..=256, slider_range = 0..=64, default = 7, precision = 1)]
        DotSize,
        #[slider(label = "Softness", range = 0.001..=64, slider_range = 0.001..=8, default = 0.6, precision = 2)]
        Softness,
        #[angle(label = "Angle", default = 0)]
        Angle,
        #[popup(label = "Palette", options = ["Custom", "MoneyMoves Core", "Editorial Mono", "Signal Blue", "Terminal", "Phosphor", "Amber", "Paper"], default = 2)]
        Palette,
        #[color(label = "Dot Color", default = "#FF2448")]
        Foreground,
        #[color(label = "Background", default = "#0B0B70")]
        Background,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)]
        Mix,
    }
}

prgpu::kernel! {
    dot_matrix {
        spacing: f32 = Spacing,
        dot_size: f32 = DotSize,
        softness: f32 = Softness,
        angle_degrees: f32 = Angle,
        palette: u32 = Palette,
        foreground: [f32; 4] = Foreground,
        background: [f32; 4] = Background,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesDotMatrix;

impl Effect for MoneyMovesDotMatrix {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves Dot Matrix";
        descriptor
            .about("MoneyMoves Dot Matrix — luminance-driven branded LED dots")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(dot_matrix::kernel());
    }
}

prgpu::register_effect!(MoneyMovesDotMatrix);
