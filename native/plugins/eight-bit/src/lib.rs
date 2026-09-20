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
        #[slider(label = "Pixel Size", range = 1..=256, slider_range = 1..=64, default = 8, precision = 0)]
        PixelSize,
        #[slider(label = "Color Count", range = 2..=8, default = 6, precision = 0)]
        ColorCount,
        #[popup(label = "Palette", options = ["Custom", "MoneyMoves Core", "Editorial Mono", "Signal Blue", "Terminal", "Phosphor", "Amber", "Paper"], default = 2)]
        Palette,
        #[slider(label = "Quantization", range = 0..=1, default = 1, percent, precision = 1)]
        Quantization,
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
    eight_bit {
        pixel_size: f32 = PixelSize,
        color_count: f32 = ColorCount,
        palette: u32 = Palette,
        quantization: f32 = Quantization,
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

pub struct MoneyMovesEightBit;

impl Effect for MoneyMovesEightBit {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves 8-bit";
        descriptor
            .about("MoneyMoves 8-bit — pixel blocks with OKLab palette quantization")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(eight_bit::kernel());
    }
}

prgpu::register_effect!(MoneyMovesEightBit);
