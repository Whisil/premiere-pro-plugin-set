use crate::{RgbaImageF32, rgb_shift::EdgeBehavior};
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct ChromaticAberrationParams {
    pub amount_pixels: f32,
    pub center_x: f32,
    pub center_y: f32,
    pub falloff: f32,
    pub edge_behavior: EdgeBehavior,
    pub mix: f32,
}

impl Default for ChromaticAberrationParams {
    fn default() -> Self {
        Self {
            amount_pixels: 18.0,
            center_x: 0.5,
            center_y: 0.5,
            falloff: 1.25,
            edge_behavior: EdgeBehavior::Clamp,
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: ChromaticAberrationParams) -> RgbaImageF32 {
    let mut output = input.clone();
    let width = input.width().max(1) as f32;
    let height = input.height().max(1) as f32;
    let center_x = params.center_x.clamp(0.0, 1.0);
    let center_y = params.center_y.clamp(0.0, 1.0);
    let falloff = params.falloff.clamp(0.1, 4.0);
    let mix = params.mix.clamp(0.0, 1.0);

    for y in 0..input.height() as i32 {
        for x in 0..input.width() as i32 {
            let source = input.get_clamped(x, y);
            let normalized_x = (x as f32 + 0.5) / width;
            let normalized_y = (y as f32 + 0.5) / height;
            let radial_x = normalized_x - center_x;
            let radial_y = normalized_y - center_y;
            let distance = (radial_x * radial_x + radial_y * radial_y).sqrt();
            let normalized_distance = (distance * std::f32::consts::SQRT_2).clamp(0.0, 1.0);
            let length = (radial_x * radial_x + radial_y * radial_y)
                .sqrt()
                .max(1.0e-6);
            let displacement = params.amount_pixels.max(0.0) * normalized_distance.powf(falloff);
            let dx = radial_x / length * displacement;
            let dy = radial_y / length * displacement;

            let red = sample(
                input,
                (x as f32 + dx).round() as i32,
                (y as f32 + dy).round() as i32,
                params.edge_behavior,
            );
            let blue = sample(
                input,
                (x as f32 - dx).round() as i32,
                (y as f32 - dy).round() as i32,
                params.edge_behavior,
            );
            let index = (y as u32 * input.width() + x as u32) as usize;
            output.pixels_mut()[index] = [
                lerp(source[0], red[0], mix),
                source[1],
                lerp(source[2], blue[2], mix),
                source[3],
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

    fn strip() -> RgbaImageF32 {
        RgbaImageF32::new(
            5,
            1,
            vec![
                [0.1, 0.2, 0.9, 0.2],
                [0.3, 0.4, 0.7, 0.4],
                [0.5, 0.6, 0.5, 0.6],
                [0.7, 0.8, 0.3, 0.8],
                [0.9, 1.0, 0.1, 1.0],
            ],
        )
    }

    #[test]
    fn separates_red_and_blue_radially_and_preserves_alpha() {
        let input = strip();
        let output = apply(
            &input,
            ChromaticAberrationParams {
                amount_pixels: 2.0,
                center_x: 0.5,
                center_y: 0.5,
                falloff: 0.1,
                ..Default::default()
            },
        );

        assert!(output.pixels()[1][0] < input.pixels()[1][0]);
        assert!(output.pixels()[1][2] < input.pixels()[1][2]);
        assert_eq!(output.pixels()[1][3], input.pixels()[1][3]);
    }

    #[test]
    fn zero_mix_is_an_exact_passthrough() {
        let input = strip();
        let output = apply(
            &input,
            ChromaticAberrationParams {
                mix: 0.0,
                ..Default::default()
            },
        );
        assert_eq!(output, input);
    }
}
