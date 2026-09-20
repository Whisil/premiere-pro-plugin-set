use crate::{RgbaImageF32, palette::nearest_palette_index};
use serde::{Deserialize, Serialize};

pub const DEFAULT_PALETTE: [[f32; 3]; 8] = [
    [1.0, 0.141, 0.282],
    [0.043, 0.043, 0.439],
    [1.0, 0.965, 0.847],
    [0.224, 0.89, 0.616],
    [1.0, 0.8, 0.157],
    [0.949, 0.161, 0.831],
    [0.031, 0.031, 0.031],
    [0.239, 0.545, 1.0],
];

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct EightBitParams {
    pub pixel_size: u32,
    pub color_count: u32,
    pub palette: [[f32; 3]; 8],
    pub quantization_strength: f32,
    pub mix: f32,
}

impl Default for EightBitParams {
    fn default() -> Self {
        Self {
            pixel_size: 8,
            color_count: 6,
            palette: DEFAULT_PALETTE,
            quantization_strength: 1.0,
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: EightBitParams) -> RgbaImageF32 {
    let mut output = input.clone();
    let pixel_size = params.pixel_size.clamp(1, 256) as i32;
    let color_count = params.color_count.clamp(2, 8) as usize;
    let palette = &params.palette[..color_count];
    let quantization = params.quantization_strength.clamp(0.0, 1.0);
    let effect_mix = params.mix.clamp(0.0, 1.0);

    for y in 0..input.height() as i32 {
        for x in 0..input.width() as i32 {
            let source = input.get_clamped(x, y);
            let sample_x = (x / pixel_size) * pixel_size + pixel_size / 2;
            let sample_y = (y / pixel_size) * pixel_size + pixel_size / 2;
            let sampled = input.get_clamped(sample_x, sample_y);
            let palette_index =
                nearest_palette_index([sampled[0], sampled[1], sampled[2]], palette).unwrap_or(0);
            let quantized = palette[palette_index];
            let stylized = [
                mix(sampled[0], quantized[0], quantization),
                mix(sampled[1], quantized[1], quantization),
                mix(sampled[2], quantized[2], quantization),
            ];
            let index = (y as u32 * input.width() + x as u32) as usize;
            output.pixels_mut()[index] = [
                mix(source[0], stylized[0], effect_mix),
                mix(source[1], stylized[1], effect_mix),
                mix(source[2], stylized[2], effect_mix),
                source[3],
            ];
        }
    }
    output
}

fn mix(a: f32, b: f32, amount: f32) -> f32 {
    a + (b - a) * amount
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pixelates_quantizes_and_preserves_per_pixel_alpha() {
        let input = RgbaImageF32::new(
            2,
            2,
            vec![
                [0.9, 0.1, 0.2, 0.1],
                [0.8, 0.2, 0.3, 0.2],
                [0.1, 0.1, 0.8, 0.3],
                [0.2, 0.2, 0.9, 0.4],
            ],
        );
        let params = EightBitParams {
            pixel_size: 2,
            color_count: 2,
            palette: [
                [1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0],
                [0.0; 3],
                [0.0; 3],
                [0.0; 3],
                [0.0; 3],
                [0.0; 3],
                [0.0; 3],
            ],
            ..Default::default()
        };
        let output = apply(&input, params);
        assert!(
            output
                .pixels()
                .iter()
                .all(|pixel| pixel[..3] == [0.0, 0.0, 1.0])
        );
        assert_eq!(
            output
                .pixels()
                .iter()
                .map(|pixel| pixel[3])
                .collect::<Vec<_>>(),
            vec![0.1, 0.2, 0.3, 0.4]
        );
    }
}
