use crate::RgbaImageF32;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct CrtParams {
    pub curvature: f32,
    pub scanlines: f32,
    pub phosphor_mask: f32,
    pub convergence: f32,
    pub noise: f32,
    pub flicker: f32,
    pub vignette: f32,
    pub bloom: f32,
    pub mix: f32,
}

impl Default for CrtParams {
    fn default() -> Self {
        Self {
            curvature: 0.12,
            scanlines: 0.35,
            phosphor_mask: 0.25,
            convergence: 1.5,
            noise: 0.06,
            flicker: 0.08,
            vignette: 0.4,
            bloom: 0.25,
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: CrtParams, time_seconds: f32) -> RgbaImageF32 {
    let mut output = input.clone();
    let width = input.width().max(1) as f32;
    let height = input.height().max(1) as f32;
    let mix_amount = params.mix.clamp(0.0, 1.0);
    let frame_index = (time_seconds.max(0.0) * 30.0).floor() as u32;

    for y in 0..input.height() as i32 {
        for x in 0..input.width() as i32 {
            let original = input.get_clamped(x, y);
            let centered = [
                ((x as f32 + 0.5) / width) * 2.0 - 1.0,
                ((y as f32 + 0.5) / height) * 2.0 - 1.0,
            ];
            let radius_squared = centered[0] * centered[0] + centered[1] * centered[1];
            let warp = 1.0 + params.curvature.clamp(0.0, 0.5) * radius_squared;
            let warped = [
                (centered[0] * warp * 0.5 + 0.5) * width - 0.5,
                (centered[1] * warp * 0.5 + 0.5) * height - 0.5,
            ];
            let inside = warped[0] >= 0.0
                && warped[0] <= width - 1.0
                && warped[1] >= 0.0
                && warped[1] <= height - 1.0;
            let mut color = if inside {
                let convergence = params.convergence.clamp(0.0, 12.0);
                let red = input.get_clamped(
                    (warped[0] + convergence).round() as i32,
                    warped[1].round() as i32,
                )[0];
                let green =
                    input.get_clamped(warped[0].round() as i32, warped[1].round() as i32)[1];
                let blue = input.get_clamped(
                    (warped[0] - convergence).round() as i32,
                    warped[1].round() as i32,
                )[2];
                [red, green, blue]
            } else {
                [0.0; 3]
            };

            if inside && params.bloom > 0.0 {
                let center_x = warped[0].round() as i32;
                let center_y = warped[1].round() as i32;
                let neighbors = [
                    input.get_clamped(center_x - 2, center_y),
                    input.get_clamped(center_x + 2, center_y),
                    input.get_clamped(center_x, center_y - 2),
                    input.get_clamped(center_x, center_y + 2),
                ];
                for channel in 0..3 {
                    let glow = neighbors
                        .iter()
                        .map(|sample| (sample[channel] - 0.55).max(0.0))
                        .sum::<f32>()
                        * 0.25;
                    color[channel] += glow * params.bloom.clamp(0.0, 2.0);
                }
            }

            let scanline = 1.0
                - params.scanlines.clamp(0.0, 1.0)
                    * 0.32
                    * (0.5 + 0.5 * (std::f32::consts::PI * y as f32).cos());
            let mask_amount = params.phosphor_mask.clamp(0.0, 1.0) * 0.28;
            let triad = x.rem_euclid(3) as usize;
            for (channel, component) in color.iter_mut().enumerate() {
                let phosphor = if channel == triad {
                    1.0
                } else {
                    1.0 - mask_amount
                };
                *component *= scanline * phosphor;
            }

            let grain =
                signed_noise(x as u32, y as u32, frame_index) * params.noise.clamp(0.0, 1.0) * 0.14;
            let flicker = 1.0 + params.flicker.clamp(0.0, 1.0) * 0.08 * (time_seconds * 43.0).sin();
            let edge = centered[0].abs().max(centered[1].abs());
            let vignette =
                1.0 - params.vignette.clamp(0.0, 1.0) * smoothstep(0.35, 1.0, edge) * 0.8;
            for component in &mut color {
                *component = (*component + grain) * flicker * vignette;
            }

            let index = (y as u32 * input.width() + x as u32) as usize;
            output.pixels_mut()[index] = [
                lerp(original[0], color[0], mix_amount),
                lerp(original[1], color[1], mix_amount),
                lerp(original[2], color[2], mix_amount),
                original[3],
            ];
        }
    }

    output
}

fn signed_noise(x: u32, y: u32, frame: u32) -> f32 {
    let mut value = x
        .wrapping_mul(1_973)
        .wrapping_add(y.wrapping_mul(9_277))
        .wrapping_add(frame.wrapping_mul(26_699))
        .wrapping_add(911);
    value ^= value << 13;
    value ^= value >> 17;
    value ^= value << 5;
    value as f32 / u32::MAX as f32 - 0.5
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

    fn fixture() -> RgbaImageF32 {
        RgbaImageF32::new(
            3,
            3,
            vec![
                [1.0, 0.0, 0.0, 0.1],
                [0.0, 1.0, 0.0, 0.2],
                [0.0, 0.0, 1.0, 0.3],
                [1.0, 1.0, 0.0, 0.4],
                [0.5, 0.5, 0.5, 0.5],
                [0.0, 1.0, 1.0, 0.6],
                [1.0, 0.0, 1.0, 0.7],
                [1.0, 1.0, 1.0, 0.8],
                [0.1, 0.2, 0.3, 0.9],
            ],
        )
    }

    #[test]
    fn is_timeline_deterministic_and_preserves_alpha() {
        let input = fixture();
        let first = apply(&input, CrtParams::default(), 1.25);
        let repeated = apply(&input, CrtParams::default(), 1.25);
        let next_frame = apply(&input, CrtParams::default(), 1.25 + 1.0 / 30.0);

        assert_eq!(first, repeated);
        assert_ne!(first, next_frame);
        for (source, rendered) in input.pixels().iter().zip(first.pixels()) {
            assert_eq!(source[3], rendered[3]);
        }
    }

    #[test]
    fn convergence_and_phosphor_mask_separate_channels() {
        let input = fixture();
        let output = apply(
            &input,
            CrtParams {
                curvature: 0.0,
                convergence: 1.0,
                phosphor_mask: 1.0,
                scanlines: 0.0,
                noise: 0.0,
                flicker: 0.0,
                vignette: 0.0,
                bloom: 0.0,
                ..Default::default()
            },
            0.0,
        );
        assert_ne!(output.pixels()[3][0], output.pixels()[3][2]);
    }

    #[test]
    fn zero_mix_is_an_exact_passthrough() {
        let input = fixture();
        assert_eq!(
            apply(
                &input,
                CrtParams {
                    mix: 0.0,
                    ..Default::default()
                },
                3.0,
            ),
            input
        );
    }
}
