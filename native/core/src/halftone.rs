use crate::RgbaImageF32;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DotShape {
    #[default]
    Circle,
    Square,
    Line,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct HalftoneParams {
    pub cell_size: f32,
    pub angle_degrees: f32,
    pub shape: DotShape,
    pub contrast: f32,
    pub foreground: [f32; 3],
    pub background: [f32; 3],
    pub invert: bool,
    pub mix: f32,
}

impl Default for HalftoneParams {
    fn default() -> Self {
        Self {
            cell_size: 8.0,
            angle_degrees: 45.0,
            shape: DotShape::Circle,
            contrast: 1.25,
            foreground: [1.0, 0.141, 0.282],
            background: [1.0, 0.965, 0.847],
            invert: false,
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: HalftoneParams) -> RgbaImageF32 {
    let mut output = input.clone();
    let cell = params.cell_size.clamp(1.0, 256.0);
    let radians = params.angle_degrees.to_radians();
    let (sin, cos) = radians.sin_cos();
    let mix_value = params.mix.clamp(0.0, 1.0);

    for y in 0..input.height() {
        for x in 0..input.width() {
            let source = input.get_clamped(x as i32, y as i32);
            let rotated_x = x as f32 * cos - y as f32 * sin;
            let rotated_y = x as f32 * sin + y as f32 * cos;
            let local_x = (rotated_x / cell).rem_euclid(1.0) - 0.5;
            let local_y = (rotated_y / cell).rem_euclid(1.0) - 0.5;
            let mut luminance = source[0] * 0.2126 + source[1] * 0.7152 + source[2] * 0.0722;
            luminance = ((luminance - 0.5) * params.contrast.max(0.0) + 0.5).clamp(0.0, 1.0);
            if params.invert {
                luminance = 1.0 - luminance;
            }
            let coverage = 1.0 - luminance;
            let inside = match params.shape {
                DotShape::Circle => {
                    (local_x * local_x + local_y * local_y).sqrt() <= coverage.sqrt() * 0.5
                }
                DotShape::Square => local_x.abs().max(local_y.abs()) <= coverage * 0.5,
                DotShape::Line => local_y.abs() <= coverage * 0.5,
            };
            let color = if inside {
                params.foreground
            } else {
                params.background
            };
            let index = (y * input.width() + x) as usize;
            output.pixels_mut()[index] = [
                mix(source[0], color[0], mix_value),
                mix(source[1], color[1], mix_value),
                mix(source[2], color[2], mix_value),
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
    fn renders_palette_colors_and_preserves_alpha() {
        let input = RgbaImageF32::new(1, 1, vec![[0.0, 0.0, 0.0, 0.4]]);
        let params = HalftoneParams::default();
        let output = apply(&input, params);
        let rgb = &output.pixels()[0][..3];
        assert!(rgb == params.foreground || rgb == params.background);
        assert_eq!(output.pixels()[0][3], 0.4);
    }
}
