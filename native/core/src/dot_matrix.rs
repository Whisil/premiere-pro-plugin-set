use crate::RgbaImageF32;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct DotMatrixParams {
    pub spacing: f32,
    pub dot_size: f32,
    pub softness: f32,
    pub angle_degrees: f32,
    pub foreground: [f32; 3],
    pub background: [f32; 3],
    pub mix: f32,
}

impl Default for DotMatrixParams {
    fn default() -> Self {
        Self {
            spacing: 9.0,
            dot_size: 7.0,
            softness: 0.6,
            angle_degrees: 0.0,
            foreground: [1.0, 0.141, 0.282],
            background: [0.043, 0.043, 0.439],
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: DotMatrixParams) -> RgbaImageF32 {
    let mut output = input.clone();
    let spacing = params.spacing.clamp(1.0, 256.0);
    let maximum_radius = params.dot_size.clamp(0.0, spacing) * 0.5;
    let softness = params.softness.clamp(0.001, spacing);
    let radians = params.angle_degrees.to_radians();
    let (sin, cos) = radians.sin_cos();
    let mix_amount = params.mix.clamp(0.0, 1.0);

    for y in 0..input.height() {
        for x in 0..input.width() {
            let source = input.get_clamped(x as i32, y as i32);
            let rotated_x = x as f32 * cos - y as f32 * sin;
            let rotated_y = x as f32 * sin + y as f32 * cos;
            let local_x = (rotated_x / spacing).rem_euclid(1.0) - 0.5;
            let local_y = (rotated_y / spacing).rem_euclid(1.0) - 0.5;
            let distance = (local_x * local_x + local_y * local_y).sqrt() * spacing;
            let luminance =
                (source[0] * 0.2126 + source[1] * 0.7152 + source[2] * 0.0722).clamp(0.0, 1.0);
            let radius = maximum_radius * luminance.sqrt();
            let coverage = ((radius - distance) / softness + 0.5).clamp(0.0, 1.0);
            let stylized = [
                mix(params.background[0], params.foreground[0], coverage),
                mix(params.background[1], params.foreground[1], coverage),
                mix(params.background[2], params.foreground[2], coverage),
            ];
            let index = (y * input.width() + x) as usize;
            output.pixels_mut()[index] = [
                mix(source[0], stylized[0], mix_amount),
                mix(source[1], stylized[1], mix_amount),
                mix(source[2], stylized[2], mix_amount),
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
    fn luminance_controls_dot_coverage_and_alpha_is_preserved() {
        let input = RgbaImageF32::new(2, 1, vec![[0.0, 0.0, 0.0, 0.25], [1.0, 1.0, 1.0, 0.75]]);
        let params = DotMatrixParams {
            spacing: 2.0,
            dot_size: 2.0,
            softness: 0.001,
            ..DotMatrixParams::default()
        };
        let output = apply(&input, params);
        assert_eq!(output.pixels()[0][3], 0.25);
        assert_eq!(output.pixels()[1][3], 0.75);
        assert_ne!(&output.pixels()[0][..3], &output.pixels()[1][..3]);
    }
}
