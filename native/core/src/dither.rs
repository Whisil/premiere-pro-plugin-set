use crate::{RgbaImageF32, palette::nearest_palette_index};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DitherMode {
    Bayer2,
    #[default]
    Bayer4,
    Bayer8,
    BlueNoise,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DitherParams {
    pub mode: DitherMode,
    pub scale: u32,
    pub threshold: f32,
    pub strength: f32,
    pub palette: Vec<[f32; 3]>,
    pub mix: f32,
}

impl Default for DitherParams {
    fn default() -> Self {
        Self {
            mode: DitherMode::Bayer4,
            scale: 1,
            threshold: 0.0,
            strength: 0.75,
            palette: vec![
                [1.0, 0.141, 0.282],
                [0.043, 0.043, 0.439],
                [1.0, 0.965, 0.847],
                [0.224, 0.89, 0.616],
            ],
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: &DitherParams) -> RgbaImageF32 {
    if params.palette.is_empty() {
        return input.clone();
    }
    let mut output = input.clone();
    let scale = params.scale.clamp(1, 64);
    let strength = params.strength.clamp(0.0, 1.0);
    let mix_value = params.mix.clamp(0.0, 1.0);
    for y in 0..input.height() {
        for x in 0..input.width() {
            let source = input.get_clamped(x as i32, y as i32);
            let noise = threshold(params.mode, x / scale, y / scale) - 0.5;
            let offset = noise * strength * 0.35 + params.threshold.clamp(-1.0, 1.0) * 0.25;
            let adjusted = [
                (source[0] + offset).clamp(0.0, 1.0),
                (source[1] + offset).clamp(0.0, 1.0),
                (source[2] + offset).clamp(0.0, 1.0),
            ];
            let quantized =
                params.palette[nearest_palette_index(adjusted, &params.palette).unwrap_or(0)];
            let index = (y * input.width() + x) as usize;
            output.pixels_mut()[index] = [
                mix(source[0], quantized[0], mix_value),
                mix(source[1], quantized[1], mix_value),
                mix(source[2], quantized[2], mix_value),
                source[3],
            ];
        }
    }
    output
}

fn threshold(mode: DitherMode, x: u32, y: u32) -> f32 {
    match mode {
        DitherMode::Bayer2 => bayer(x, y, 2),
        DitherMode::Bayer4 => bayer(x, y, 4),
        DitherMode::Bayer8 => bayer(x, y, 8),
        DitherMode::BlueNoise => {
            let mut value = x.wrapping_mul(0x9E37_79B9) ^ y.wrapping_mul(0x85EB_CA6B);
            value ^= value >> 16;
            value = value.wrapping_mul(0x7FEB_352D);
            value ^= value >> 15;
            (value & 0xffff) as f32 / 65_536.0
        }
    }
}

fn bayer(mut x: u32, mut y: u32, size: u32) -> f32 {
    let mut value = 0;
    let mut bit = size / 2;
    while bit > 0 {
        value = value * 4 + (((x & 1) ^ (y & 1)) * 2 + (y & 1));
        x >>= 1;
        y >>= 1;
        bit >>= 1;
    }
    (value as f32 + 0.5) / (size * size) as f32
}

fn mix(a: f32, b: f32, amount: f32) -> f32 {
    a + (b - a) * amount
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_deterministic_and_preserves_alpha() {
        let input = RgbaImageF32::new(2, 1, vec![[0.2, 0.3, 0.4, 0.25], [0.8, 0.7, 0.6, 0.75]]);
        let params = DitherParams::default();
        let first = apply(&input, &params);
        let second = apply(&input, &params);
        assert_eq!(first, second);
        assert_eq!(first.pixels()[0][3], 0.25);
        assert_eq!(first.pixels()[1][3], 0.75);
    }
}
