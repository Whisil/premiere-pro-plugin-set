use crate::RgbaImageF32;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum BloomQuality {
    Draft,
    #[default]
    Standard,
    High,
}

impl BloomQuality {
    fn samples(self) -> usize {
        match self {
            Self::Draft => 4,
            Self::Standard => 8,
            Self::High => 16,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct BloomParams {
    pub threshold: f32,
    pub knee: f32,
    pub radius: f32,
    pub intensity: f32,
    pub tint: [f32; 3],
    pub quality: BloomQuality,
    pub mix: f32,
}

impl Default for BloomParams {
    fn default() -> Self {
        Self {
            threshold: 0.7,
            knee: 0.2,
            radius: 20.0,
            intensity: 0.8,
            tint: [1.0, 0.9, 0.8],
            quality: BloomQuality::Standard,
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: BloomParams) -> RgbaImageF32 {
    let mut output = input.clone();
    let sample_count = params.quality.samples();
    let threshold = params.threshold.clamp(0.0, 2.0);
    let knee = params.knee.clamp(0.001, 1.0);
    let mix = params.mix.clamp(0.0, 1.0);

    for y in 0..input.height() as i32 {
        for x in 0..input.width() as i32 {
            let original = input.get_clamped(x, y);
            let mut bloom = [0.0; 3];
            let mut weight_sum = 0.0;

            for sample_index in 0..sample_count {
                let fraction = (sample_index as f32 + 0.5) / sample_count as f32;
                let angle = sample_index as f32 * 2.399_963_1;
                let distance = params.radius.max(0.0) * fraction.sqrt();
                let sample = input.get_clamped(
                    (x as f32 + angle.cos() * distance).round() as i32,
                    (y as f32 + angle.sin() * distance).round() as i32,
                );
                let luminance = sample[0] * 0.2126 + sample[1] * 0.7152 + sample[2] * 0.0722;
                let weight = smoothstep(threshold - knee, threshold + knee, luminance);
                bloom[0] += sample[0] * weight;
                bloom[1] += sample[1] * weight;
                bloom[2] += sample[2] * weight;
                weight_sum += weight;
            }

            if weight_sum > 0.0 {
                bloom[0] /= weight_sum;
                bloom[1] /= weight_sum;
                bloom[2] /= weight_sum;
            }
            let bloomed = [
                original[0] + bloom[0] * params.tint[0].clamp(0.0, 1.0) * params.intensity.max(0.0),
                original[1] + bloom[1] * params.tint[1].clamp(0.0, 1.0) * params.intensity.max(0.0),
                original[2] + bloom[2] * params.tint[2].clamp(0.0, 1.0) * params.intensity.max(0.0),
            ];
            let index = (y as u32 * input.width() + x as u32) as usize;
            output.pixels_mut()[index] = [
                lerp(original[0], bloomed[0], mix),
                lerp(original[1], bloomed[1], mix),
                lerp(original[2], bloomed[2], mix),
                original[3],
            ];
        }
    }
    output
}

fn smoothstep(edge0: f32, edge1: f32, value: f32) -> f32 {
    let t = ((value - edge0) / (edge1 - edge0).max(1.0e-6)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spreads_bright_pixels_and_preserves_alpha() {
        let input = RgbaImageF32::new(
            3,
            1,
            vec![
                [0.0, 0.0, 0.0, 0.25],
                [1.0, 1.0, 1.0, 0.5],
                [0.0, 0.0, 0.0, 0.75],
            ],
        );
        let output = apply(
            &input,
            BloomParams {
                radius: 2.0,
                quality: BloomQuality::High,
                ..Default::default()
            },
        );
        assert!(output.pixels()[0][0] > 0.0);
        assert_eq!(output.pixels()[0][3], 0.25);
    }

    #[test]
    fn zero_mix_is_an_exact_passthrough() {
        let input = RgbaImageF32::new(1, 1, vec![[1.0, 0.8, 0.6, 0.4]]);
        assert_eq!(
            apply(
                &input,
                BloomParams {
                    mix: 0.0,
                    ..Default::default()
                }
            ),
            input
        );
    }
}
