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
        #[slider(label = "Cell Size", range = 4..=64, default = 12, precision = 0)]
        CellSize,
        #[popup(label = "Character Family", options = ["Standard", "Block", "Dot", "Binary", "Shade", "Braille"], default = 1)]
        Charset,
        #[slider(label = "Glyph Contrast", range = 0..=4, slider_range = 0..=2, default = 1.2, precision = 2)]
        GlyphContrast,
        #[checkbox(label = "Invert", default = false)]
        Invert,
        #[popup(label = "Color Mode", options = ["Source", "Mono", "Palette"], default = 1)]
        ColorMode,
        #[popup(label = "Palette", options = ["Custom", "MoneyMoves Core", "Editorial Mono", "Signal Blue", "Terminal", "Phosphor", "Amber", "Paper"], default = 2)]
        Palette,
        #[color(label = "Foreground", default = "#FF2448")]
        Foreground,
        #[color(label = "Background", default = "#0B0B16")]
        Background,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)]
        Mix,
    }
}

prgpu::kernel! {
    ascii {
        cell_size: f32 = CellSize,
        charset: u32 = Charset,
        glyph_contrast: f32 = GlyphContrast,
        invert: bool = Invert,
        color_mode: u32 = ColorMode,
        palette: u32 = Palette,
        foreground: [f32; 4] = Foreground,
        background: [f32; 4] = Background,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesAscii;

impl Effect for MoneyMovesAscii {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves ASCII";
        descriptor
            .about("MoneyMoves ASCII — real-time procedural character-cell rendering")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(ascii::kernel());
    }
}

prgpu::register_effect!(MoneyMovesAscii);
