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
        #[slider(label = "Amount", range = 0..=200, slider_range = 0..=50, default = 12, precision = 1)]
        Amount,
        #[angle(label = "Direction", default = 0)]
        Direction,
        #[slider(label = "Red Offset", range = -2..=2, default = 1, precision = 2)]
        RedOffset,
        #[slider(label = "Green Offset", range = -2..=2, default = 0, precision = 2)]
        GreenOffset,
        #[slider(label = "Blue Offset", range = -2..=2, default = -1, precision = 2)]
        BlueOffset,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)]
        Mix,
    }
}

prgpu::kernel! {
    rgb_shift {
        amount: f32 = Amount,
        angle_degrees: f32 = Direction,
        red_scale: f32 = RedOffset,
        green_scale: f32 = GreenOffset,
        blue_scale: f32 = BlueOffset,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesRgbShift;

impl Effect for MoneyMovesRgbShift {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        // prgpu 0.2.0 intentionally leaves the runtime descriptor name blank;
        // the PiPL name does not populate the AEGP registration call.
        descriptor.display_name = "MoneyMoves RGB Shift";
        descriptor
            .about("MoneyMoves RGB Shift — deterministic per-channel displacement")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(rgb_shift::kernel());
    }
}

prgpu::register_effect!(MoneyMovesRgbShift);
