use crate::RgbaImageF32;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EdgeBehavior {
    #[default]
    Clamp,
    Mirror,
    Wrap,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct RgbShiftParams {
    pub amount_pixels: f32,
    pub angle_degrees: f32,
    pub red_scale: f32,
    pub green_scale: f32,
    pub blue_scale: f32,
    pub mix: f32,
    pub edge_behavior: EdgeBehavior,
}

impl Default for RgbShiftParams {
    fn default() -> Self {
        Self {
            amount_pixels: 12.0,
            angle_degrees: 0.0,
            red_scale: 1.0,
            green_scale: 0.0,
            blue_scale: -1.0,
            mix: 1.0,
            edge_behavior: EdgeBehavior::Clamp,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: RgbShiftParams) -> RgbaImageF32 {
    let mut output = input.clone();
    let angle = params.angle_degrees.to_radians();
    let dx = params.amount_pixels * angle.cos();
    let dy = params.amount_pixels * angle.sin();
    let mix = params.mix.clamp(0.0, 1.0);

    for y in 0..input.height() as i32 {
        for x in 0..input.width() as i32 {
            let source = input.get_clamped(x, y);
            let red = sample(
                input,
                (x as f32 + dx * params.red_scale).round() as i32,
                (y as f32 + dy * params.red_scale).round() as i32,
                params.edge_behavior,
            );
            let green = sample(
                input,
                (x as f32 + dx * params.green_scale).round() as i32,
                (y as f32 + dy * params.green_scale).round() as i32,
                params.edge_behavior,
            );
            let blue = sample(
                input,
                (x as f32 + dx * params.blue_scale).round() as i32,
                (y as f32 + dy * params.blue_scale).round() as i32,
                params.edge_behavior,
            );
            let shifted = [red[0], green[1], blue[2], source[3]];
            let index = (y as u32 * input.width() + x as u32) as usize;
            output.pixels_mut()[index] = [
                lerp(source[0], shifted[0], mix),
                lerp(source[1], shifted[1], mix),
                lerp(source[2], shifted[2], mix),
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

    #[test]
    fn preserves_alpha_and_shifts_channels() {
        let input = RgbaImageF32::new(
            3,
            1,
            vec![
                [1.0, 0.1, 0.2, 0.5],
                [0.3, 1.0, 0.4, 0.6],
                [0.5, 0.6, 1.0, 0.7],
            ],
        );
        let output = apply(
            &input,
            RgbShiftParams {
                amount_pixels: 1.0,
                ..Default::default()
            },
        );
        assert_eq!(output.pixels()[1], [0.5, 1.0, 0.2, 0.6]);
    }

    #[test]
    fn edge_modes_are_deterministic_and_distinct() {
        let input = RgbaImageF32::new(
            3,
            1,
            vec![
                [0.1, 0.0, 0.0, 1.0],
                [0.5, 0.0, 0.0, 1.0],
                [0.9, 0.0, 0.0, 1.0],
            ],
        );
        let render = |edge_behavior| {
            apply(
                &input,
                RgbShiftParams {
                    amount_pixels: 1.0,
                    red_scale: -1.0,
                    green_scale: 0.0,
                    blue_scale: 0.0,
                    edge_behavior,
                    ..Default::default()
                },
            )
            .pixels()[0][0]
        };
        assert_eq!(render(EdgeBehavior::Clamp), 0.1);
        assert_eq!(render(EdgeBehavior::Mirror), 0.5);
        assert_eq!(render(EdgeBehavior::Wrap), 0.9);
    }
}
