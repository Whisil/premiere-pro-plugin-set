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
        #[popup(label = "Mode", options = ["Bayer 2×2", "Bayer 4×4", "Bayer 8×8", "Blue Noise"], default = 2)]
        Mode,
        #[slider(label = "Scale", range = 1..=64, default = 1, precision = 0)]
        Scale,
        #[slider(label = "Color Count", range = 2..=8, default = 4, precision = 0)]
        ColorCount,
        #[popup(label = "Palette", options = ["Custom", "MoneyMoves Core", "Editorial Mono", "Signal Blue", "Terminal", "Phosphor", "Amber", "Paper"], default = 2)]
        Palette,
        #[slider(label = "Threshold", range = -1..=1, default = 0, precision = 2)]
        Threshold,
        #[slider(label = "Strength", range = 0..=1, default = 0.75, percent, precision = 1)]
        Strength,
        #[color(label = "Color 1", default = "#FF2448")] Color1,
        #[color(label = "Color 2", default = "#0B0B70")] Color2,
        #[color(label = "Color 3", default = "#FFF6D8")] Color3,
        #[color(label = "Color 4", default = "#39E39D")] Color4,
        #[color(label = "Color 5", default = "#FFCC28")] Color5,
        #[color(label = "Color 6", default = "#F229D4")] Color6,
        #[color(label = "Color 7", default = "#080808")] Color7,
        #[color(label = "Color 8", default = "#3D8BFF")] Color8,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)] Mix,
    }
}

prgpu::kernel! {
    dither {
        mode: u32 = Mode,
        scale: f32 = Scale,
        color_count: f32 = ColorCount,
        palette: u32 = Palette,
        threshold: f32 = Threshold,
        strength: f32 = Strength,
        color1: [f32; 4] = Color1,
        color2: [f32; 4] = Color2,
        color3: [f32; 4] = Color3,
        color4: [f32; 4] = Color4,
        color5: [f32; 4] = Color5,
        color6: [f32; 4] = Color6,
        color7: [f32; 4] = Color7,
        color8: [f32; 4] = Color8,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesDither;

impl Effect for MoneyMovesDither {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves Dither";
        descriptor
            .about("MoneyMoves Dither — ordered and deterministic blue-noise palette dithering")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(dither::kernel());
    }
}

prgpu::register_effect!(MoneyMovesDither);
