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
        #[slider(label = "Cell Size", range = 1..=256, slider_range = 2..=64, default = 8, precision = 1)]
        CellSize,
        #[angle(label = "Angle", default = 45)]
        Angle,
        #[popup(label = "Dot Shape", options = ["Circle", "Square", "Line"], default = 1)]
        DotShape,
        #[slider(label = "Contrast", range = 0..=4, slider_range = 0..=2, default = 1.25, precision = 2)]
        Contrast,
        #[popup(label = "Palette", options = ["Custom", "MoneyMoves Core", "Editorial Mono", "Signal Blue", "Terminal", "Phosphor", "Amber", "Paper"], default = 2)]
        Palette,
        #[color(label = "Foreground", default = "#FF2448")]
        Foreground,
        #[color(label = "Background", default = "#FFF6D8")]
        Background,
        #[checkbox(label = "Invert", default = false)]
        Invert,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)]
        Mix,
    }
}

prgpu::kernel! {
    halftone {
        cell_size: f32 = CellSize,
        angle_degrees: f32 = Angle,
        dot_shape: u32 = DotShape,
        contrast: f32 = Contrast,
        palette: u32 = Palette,
        foreground: [f32; 4] = Foreground,
        background: [f32; 4] = Background,
        invert: bool = Invert,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesHalftone;

impl Effect for MoneyMovesHalftone {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves Halftone";
        descriptor
            .about("MoneyMoves Halftone — palette-aware print dots and lines")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(halftone::kernel());
    }
}

prgpu::register_effect!(MoneyMovesHalftone);
