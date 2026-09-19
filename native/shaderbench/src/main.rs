use anyhow::{Context, Result};
use clap::{Parser, ValueEnum};
use image::{DynamicImage, RgbaImage};
use moneymoves_core::{
    RgbaImageF32,
    frame_gate::FrameGateParams,
    rgb_shift::{RgbShiftParams, apply as apply_rgb_shift},
};
use serde::de::DeserializeOwned;
use std::{fs, path::PathBuf};

#[derive(Clone, Copy, Debug, ValueEnum)]
enum Effect {
    RgbShift,
    FrameGate,
}

#[derive(Debug, Parser)]
#[command(about = "Headless reference renderer for MoneyMoves effects")]
struct Args {
    #[arg(long, value_enum)]
    effect: Effect,
    #[arg(long)]
    input: PathBuf,
    #[arg(long)]
    output: PathBuf,
    #[arg(long)]
    params: Option<PathBuf>,
    #[arg(long, default_value_t = 0)]
    frame: u32,
    #[arg(long, default_value_t = 30)]
    total_frames: u32,
}

fn load_params<T: DeserializeOwned + Default>(path: &Option<PathBuf>) -> Result<T> {
    match path {
        Some(path) => serde_json::from_slice(
            &fs::read(path).with_context(|| format!("reading {}", path.display()))?,
        )
        .with_context(|| format!("parsing {}", path.display())),
        None => Ok(T::default()),
    }
}

fn to_float(image: DynamicImage) -> RgbaImageF32 {
    let image = image.to_rgba8();
    let pixels = image
        .pixels()
        .map(|pixel| pixel.0.map(|channel| channel as f32 / 255.0))
        .collect();
    RgbaImageF32::new(image.width(), image.height(), pixels)
}

fn to_u8(image: RgbaImageF32) -> RgbaImage {
    let bytes: Vec<u8> = image
        .pixels()
        .iter()
        .flat_map(|pixel| pixel.map(|channel| (channel.clamp(0.0, 1.0) * 255.0).round() as u8))
        .collect();
    RgbaImage::from_raw(image.width(), image.height(), bytes)
        .expect("dimensions match the pixel buffer")
}

fn main() -> Result<()> {
    let args = Args::parse();
    let input = to_float(
        image::open(&args.input).with_context(|| format!("opening {}", args.input.display()))?,
    );
    let output = match args.effect {
        Effect::RgbShift => apply_rgb_shift(&input, load_params::<RgbShiftParams>(&args.params)?),
        Effect::FrameGate => {
            let params = load_params::<FrameGateParams>(&args.params)?;
            let mut output = input;
            if !params.is_visible(args.frame, args.total_frames) {
                for pixel in output.pixels_mut() {
                    *pixel = [0.0; 4];
                }
            }
            output
        }
    };
    to_u8(output)
        .save(&args.output)
        .with_context(|| format!("writing {}", args.output.display()))?;
    Ok(())
}
