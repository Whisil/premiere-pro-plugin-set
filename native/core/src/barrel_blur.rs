use crate::{RgbaImageF32, rgb_shift::EdgeBehavior};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BlurQuality {
    Draft,
    #[default]
    Standard,
    High,
}

impl BlurQuality {
    fn samples(self) -> usize {
        match self {
            Self::Draft => 4,
            Self::Standard => 8,
            Self::High => 16,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct BarrelBlurParams {
    pub distortion: f32,
    pub blur_radius: f32,
    pub center_x: f32,
    pub center_y: f32,
    pub falloff: f32,
    pub quality: BlurQuality,
    pub edge_behavior: EdgeBehavior,
    pub mix: f32,
}

impl Default for BarrelBlurParams {
    fn default() -> Self {
        Self {
            distortion: 0.25,
            blur_radius: 8.0,
            center_x: 0.5,
            center_y: 0.5,
            falloff: 1.5,
            quality: BlurQuality::Standard,
            edge_behavior: EdgeBehavior::Clamp,
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: BarrelBlurParams) -> RgbaImageF32 {
    let mut output = input.clone();
    let width = input.width().max(1) as f32;
    let height = input.height().max(1) as f32;
    let center = [
        params.center_x.clamp(0.0, 1.0),
        params.center_y.clamp(0.0, 1.0),
    ];
    let falloff = params.falloff.clamp(0.1, 4.0);
    let mix = params.mix.clamp(0.0, 1.0);
    let sample_count = params.quality.samples();

    for y in 0..input.height() as i32 {
        for x in 0..input.width() as i32 {
            let original = input.get_clamped(x, y);
            let normalized = [(x as f32 + 0.5) / width, (y as f32 + 0.5) / height];
            let radial = [normalized[0] - center[0], normalized[1] - center[1]];
            let radial_length = (radial[0] * radial[0] + radial[1] * radial[1]).sqrt();
            let radial_unit = [
                radial[0] / radial_length.max(1.0e-6),
                radial[1] / radial_length.max(1.0e-6),
            ];
            let radial_amount = (radial_length * std::f32::consts::SQRT_2).clamp(0.0, 1.0);
            let warp_scale =
                1.0 + params.distortion.clamp(-1.0, 1.0) * radial_length * radial_length;
            let warped = [
                (center[0] + radial[0] * warp_scale) * width - 0.5,
                (center[1] + radial[1] * warp_scale) * height - 0.5,
            ];
            let blur = params.blur_radius.max(0.0) * radial_amount.powf(falloff);
            let mut accumulated = [0.0; 3];

            for sample_index in 0..sample_count {
                let position = if sample_count == 1 {
                    0.0
                } else {
                    sample_index as f32 / (sample_count - 1) as f32 - 0.5
                };
                let sampled = sample(
                    input,
                    (warped[0] + radial_unit[0] * blur * position).round() as i32,
                    (warped[1] + radial_unit[1] * blur * position).round() as i32,
                    params.edge_behavior,
                );
                accumulated[0] += sampled[0];
                accumulated[1] += sampled[1];
                accumulated[2] += sampled[2];
            }

            let inverse_samples = 1.0 / sample_count as f32;
            let index = (y as u32 * input.width() + x as u32) as usize;
            output.pixels_mut()[index] = [
                lerp(original[0], accumulated[0] * inverse_samples, mix),
                lerp(original[1], accumulated[1] * inverse_samples, mix),
                lerp(original[2], accumulated[2] * inverse_samples, mix),
                original[3],
            ];
        }
    }

    output
}

fn sample(input: &RgbaImageF32, x: i32, y: i32, edge_behavior: EdgeBehavior) -> [f32; 4] {
    let map = |coordinate: i32, size: u32| -> i32 {
        let size = size.max(1) as i32;
        match edge_behavior {
            EdgeBehavior::Clamp => coordinate.clamp(0, size - 1),
            EdgeBehavior::Wrap => coordinate.rem_euclid(size),
            EdgeBehavior::Mirror if size == 1 => 0,
            EdgeBehavior::Mirror => {
                let period = 2 * (size - 1);
                let folded = coordinate.rem_euclid(period);
                if folded < size {
                    folded
                } else {
                    period - folded
                }
            }
        }
    };
    input.get_clamped(map(x, input.width()), map(y, input.height()))
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;

    fn gradient() -> RgbaImageF32 {
        RgbaImageF32::new(
            5,
            1,
            vec![
                [0.0, 0.0, 0.0, 0.2],
                [0.25, 0.25, 0.25, 0.4],
                [0.5, 0.5, 0.5, 0.6],
                [0.75, 0.75, 0.75, 0.8],
                [1.0, 1.0, 1.0, 1.0],
            ],
        )
    }

    #[test]
    fn distorts_edges_and_preserves_source_alpha() {
        let input = gradient();
        let output = apply(
            &input,
            BarrelBlurParams {
                distortion: -1.0,
                blur_radius: 4.0,
                falloff: 0.1,
                quality: BlurQuality::High,
                ..Default::default()
            },
        );

        assert_ne!(output.pixels()[0][0], input.pixels()[0][0]);
        assert_eq!(output.pixels()[0][3], input.pixels()[0][3]);
    }

    #[test]
    fn zero_mix_is_an_exact_passthrough() {
        let input = gradient();
        let output = apply(
            &input,
            BarrelBlurParams {
                mix: 0.0,
                ..Default::default()
            },
        );
        assert_eq!(output, input);
    }
}
