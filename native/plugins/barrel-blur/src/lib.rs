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
        #[slider(label = "Distortion", range = -1..=1, default = 0.25, precision = 2)]
        Distortion,
        #[slider(label = "Blur Radius", range = 0..=128, slider_range = 0..=48, default = 8, precision = 1)]
        BlurRadius,
        #[slider(label = "Center X", range = 0..=1, default = 0.5, percent, precision = 1)]
        CenterX,
        #[slider(label = "Center Y", range = 0..=1, default = 0.5, percent, precision = 1)]
        CenterY,
        #[slider(label = "Falloff", range = 0.1..=4, slider_range = 0.1..=3, default = 1.5, precision = 2)]
        Falloff,
        #[popup(label = "Quality", options = ["Draft", "Standard", "High"], default = 2)]
        Quality,
        #[popup(label = "Edges", options = ["Clamp", "Mirror", "Wrap"], default = 1)]
        EdgeBehavior,
        #[slider(label = "Mix", range = 0..=1, default = 1, percent, precision = 1)]
        Mix,
    }
}

prgpu::kernel! {
    barrel_blur {
        distortion: f32 = Distortion,
        blur_radius: f32 = BlurRadius,
        center_x: f32 = CenterX,
        center_y: f32 = CenterY,
        falloff: f32 = Falloff,
        quality: u32 = Quality,
        edge_behavior: u32 = EdgeBehavior,
        mix_amount: f32 = Mix,
    }
}

pub struct MoneyMovesBarrelBlur;

impl Effect for MoneyMovesBarrelBlur {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves Barrel Blur";
        descriptor
            .about("MoneyMoves Barrel Blur — radial distortion and directional edge blur")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(barrel_blur::kernel());
    }
}

prgpu::register_effect!(MoneyMovesBarrelBlur);
