use crate::RgbaImageF32;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ProgressiveBlurQuality {
    Draft,
    #[default]
    Standard,
    High,
}

impl ProgressiveBlurQuality {
    fn samples(self) -> usize {
        match self {
            Self::Draft => 4,
            Self::Standard => 8,
            Self::High => 16,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct ProgressiveBlurParams {
    pub strength: f32,
    pub direction_degrees: f32,
    pub start: f32,
    pub end: f32,
    pub feather: f32,
    pub invert: bool,
    pub quality: ProgressiveBlurQuality,
    pub mix: f32,
}

impl Default for ProgressiveBlurParams {
    fn default() -> Self {
        Self {
            strength: 24.0,
            direction_degrees: 90.0,
            start: 0.2,
            end: 0.8,
            feather: 1.0,
            invert: false,
            quality: ProgressiveBlurQuality::Standard,
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: ProgressiveBlurParams) -> RgbaImageF32 {
    let mut output = input.clone();
    let width = input.width().max(1) as f32;
    let height = input.height().max(1) as f32;
    let radians = params.direction_degrees.to_radians();
    let axis = [radians.cos(), radians.sin()];
    let axis_extent = (axis[0].abs() + axis[1].abs()).max(1.0e-6);
    let sample_count = params.quality.samples();
    let mix_amount = params.mix.clamp(0.0, 1.0);

    for y in 0..input.height() as i32 {
        for x in 0..input.width() as i32 {
            let original = input.get_clamped(x, y);
            let normalized = [(x as f32 + 0.5) / width, (y as f32 + 0.5) / height];
            let progress = (0.5
                + ((normalized[0] - 0.5) * axis[0] + (normalized[1] - 0.5) * axis[1])
                    / axis_extent)
                .clamp(0.0, 1.0);
            let mask = progressive_mask(
                progress,
                params.start,
                params.end,
                params.feather,
                params.invert,
            );
            let radius = params.strength.max(0.0) * mask;
            let mut accumulated = [0.0; 3];

            for sample_index in 0..sample_count {
                let fraction = (sample_index as f32 + 0.5) / sample_count as f32;
                let angle = sample_index as f32 * 2.399_963_1;
                let distance = radius * fraction.sqrt();
                let sampled = input.get_clamped(
                    (x as f32 + angle.cos() * distance).round() as i32,
                    (y as f32 + angle.sin() * distance).round() as i32,
                );
                accumulated[0] += sampled[0];
                accumulated[1] += sampled[1];
                accumulated[2] += sampled[2];
            }

            let inverse_samples = 1.0 / sample_count as f32;
            let index = (y as u32 * input.width() + x as u32) as usize;
            output.pixels_mut()[index] = [
                lerp(original[0], accumulated[0] * inverse_samples, mix_amount),
                lerp(original[1], accumulated[1] * inverse_samples, mix_amount),
                lerp(original[2], accumulated[2] * inverse_samples, mix_amount),
                original[3],
            ];
        }
    }

    output
}

fn progressive_mask(progress: f32, start: f32, end: f32, feather: f32, invert: bool) -> f32 {
    let start = start.clamp(0.0, 1.0);
    let end = end.clamp(0.0, 1.0);
    let denominator = end - start;
    let linear = if denominator.abs() < 1.0e-6 {
        if progress >= start { 1.0 } else { 0.0 }
    } else {
        ((progress - start) / denominator).clamp(0.0, 1.0)
    };
    let smooth = linear * linear * (3.0 - 2.0 * linear);
    let mut mask = lerp(linear, smooth, feather.clamp(0.0, 1.0));
    if invert {
        mask = 1.0 - mask;
    }
    mask
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;

    fn horizontal_gradient() -> RgbaImageF32 {
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
    fn ramps_blur_along_the_selected_direction_and_preserves_alpha() {
        let input = horizontal_gradient();
        let output = apply(
            &input,
            ProgressiveBlurParams {
                strength: 4.0,
                direction_degrees: 0.0,
                start: 0.2,
                end: 0.8,
                quality: ProgressiveBlurQuality::High,
                ..Default::default()
            },
        );

        assert_eq!(output.pixels()[0], input.pixels()[0]);
        assert_ne!(output.pixels()[4][0], input.pixels()[4][0]);
        for (source, rendered) in input.pixels().iter().zip(output.pixels()) {
            assert_eq!(source[3], rendered[3]);
        }
    }

    #[test]
    fn invert_moves_the_blurred_region_to_the_other_side() {
        let input = horizontal_gradient();
        let normal = apply(
            &input,
            ProgressiveBlurParams {
                strength: 4.0,
                direction_degrees: 0.0,
                ..Default::default()
            },
        );
        let inverted = apply(
            &input,
            ProgressiveBlurParams {
                strength: 4.0,
                direction_degrees: 0.0,
                invert: true,
                ..Default::default()
            },
        );

        assert_ne!(normal.pixels()[0], inverted.pixels()[0]);
        assert_ne!(normal.pixels()[4], inverted.pixels()[4]);
    }

    #[test]
    fn zero_mix_is_an_exact_passthrough() {
        let input = horizontal_gradient();
        assert_eq!(
            apply(
                &input,
                ProgressiveBlurParams {
                    mix: 0.0,
                    ..Default::default()
                }
            ),
            input
        );
    }
}
