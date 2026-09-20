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
        #[popup(label = "Region", options = ["Start", "End", "Start + End"], default = 3)]
        Mode,
        #[slider(label = "Start Frames", range = 1..=12, default = 5, precision = 0)]
        HeadLength,
        #[slider(label = "Start Pattern", range = 0..=4095, default = 21, precision = 0)]
        HeadMask,
        #[slider(label = "End Frames", range = 1..=12, default = 5, precision = 0)]
        TailLength,
        #[slider(label = "End Pattern", range = 0..=4095, default = 21, precision = 0)]
        TailMask,
        #[slider(label = "Clip Start Seconds", range = -86400..=86400, default = 0, precision = 3)]
        ClipStartSeconds,
        #[slider(label = "Sequence FPS", range = 1..=120, default = 30, precision = 3)]
        SequenceFps,
        #[slider(label = "Clip Frame Count", range = 1..=1000000, default = 300, precision = 0)]
        TotalFrames,
    }
}

prgpu::kernel! {
    frame_gate {
        mode: u32 = Mode,
        head_length: f32 = HeadLength,
        head_mask: f32 = HeadMask,
        tail_length: f32 = TailLength,
        tail_mask: f32 = TailMask,
        clip_start_seconds: f32 = ClipStartSeconds,
        sequence_fps: f32 = SequenceFps,
        total_frames: f32 = TotalFrames,
        timeline_seconds: f32 = time_seconds(),
    }
}

pub struct MoneyMovesFrameGate;

impl Effect for MoneyMovesFrameGate {
    type Params = Params;

    fn descriptor(mut descriptor: EffectDescriptor) -> EffectDescriptor {
        descriptor.display_name = "MoneyMoves Frame Gate";
        descriptor
            .about("MoneyMoves Frame Gate — reversible frame throttle without audio edits")
            .version(env!("CARGO_PKG_VERSION"))
            .premiere_pixel_formats([
                ae::pr::PixelFormat::Bgra4444_8u,
                ae::pr::PixelFormat::Bgra4444_16u,
                ae::pr::PixelFormat::Bgra4444_32f,
            ])
    }

    fn ui(ui: &mut Ui<Self::Params>) {
        ui.show(ClipStartSeconds, |_| false);
        ui.show(SequenceFps, |_| false);
        ui.show(TotalFrames, |_| false);
    }

    fn pipeline(graph: &mut Graph<Self::Params>) {
        graph.pass(frame_gate::kernel());
    }
}

prgpu::register_effect!(MoneyMovesFrameGate);
