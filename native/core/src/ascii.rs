use crate::RgbaImageF32;
use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AsciiCharset {
    #[default]
    Standard,
    Block,
    Dot,
    Binary,
    Shade,
    Braille,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum AsciiColorMode {
    #[default]
    Source,
    Mono,
    Palette,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize, Deserialize)]
pub struct AsciiParams {
    pub cell_size: u32,
    pub charset: AsciiCharset,
    pub glyph_contrast: f32,
    pub invert: bool,
    pub color_mode: AsciiColorMode,
    pub foreground: [f32; 3],
    pub background: [f32; 3],
    pub mix: f32,
}

impl Default for AsciiParams {
    fn default() -> Self {
        Self {
            cell_size: 12,
            charset: AsciiCharset::Standard,
            glyph_contrast: 1.2,
            invert: false,
            color_mode: AsciiColorMode::Source,
            foreground: [1.0, 0.141, 0.282],
            background: [0.043, 0.043, 0.086],
            mix: 1.0,
        }
    }
}

pub fn apply(input: &RgbaImageF32, params: AsciiParams) -> RgbaImageF32 {
    let mut output = input.clone();
    let cell = params.cell_size.clamp(4, 64);
    let mix_amount = params.mix.clamp(0.0, 1.0);

    for y in 0..input.height() {
        for x in 0..input.width() {
            let original = input.get_clamped(x as i32, y as i32);
            let center_x = ((x / cell) * cell + cell / 2).min(input.width().saturating_sub(1));
            let center_y = ((y / cell) * cell + cell / 2).min(input.height().saturating_sub(1));
            let sampled = input.get_clamped(center_x as i32, center_y as i32);
            let mut luminance = sampled[0] * 0.2126 + sampled[1] * 0.7152 + sampled[2] * 0.0722;
            luminance = ((luminance - 0.5) * params.glyph_contrast.max(0.0) + 0.5).clamp(0.0, 1.0);
            if params.invert {
                luminance = 1.0 - luminance;
            }
            let level = (luminance * 4.0).round() as u32;
            let local = [
                ((x % cell) as f32 + 0.5) / cell as f32 - 0.5,
                ((y % cell) as f32 + 0.5) / cell as f32 - 0.5,
            ];
            let foreground = match params.color_mode {
                AsciiColorMode::Source => [sampled[0], sampled[1], sampled[2]],
                AsciiColorMode::Mono | AsciiColorMode::Palette => params.foreground,
            };
            let rendered = if glyph(params.charset, level, local, x % cell, y % cell) {
                foreground
            } else {
                params.background
            };
            let index = (y * input.width() + x) as usize;
            output.pixels_mut()[index] = [
                lerp(original[0], rendered[0], mix_amount),
                lerp(original[1], rendered[1], mix_amount),
                lerp(original[2], rendered[2], mix_amount),
                original[3],
            ];
        }
    }

    output
}

fn glyph(charset: AsciiCharset, level: u32, local: [f32; 2], local_x: u32, local_y: u32) -> bool {
    if level == 0 {
        return false;
    }
    let [x, y] = local;
    match charset {
        AsciiCharset::Block => y >= 0.5 - level as f32 / 4.0,
        AsciiCharset::Dot => {
            let radius = 0.08 + level as f32 * 0.09;
            x * x + y * y <= radius * radius
        }
        AsciiCharset::Binary if level <= 2 => {
            let distance = (x * x + y * y).sqrt();
            (0.23..=0.38).contains(&distance)
        }
        AsciiCharset::Binary => x.abs() <= 0.08 && y.abs() <= 0.38,
        AsciiCharset::Shade => {
            const BAYER: [[u32; 4]; 4] =
                [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
            BAYER[(local_y % 4) as usize][(local_x % 4) as usize] < level * 4
        }
        AsciiCharset::Braille => {
            let column = ((x + 0.5) * 2.0).floor().clamp(0.0, 1.0) as u32;
            let row = ((y + 0.5) * 4.0).floor().clamp(0.0, 3.0) as u32;
            let dot_index = row * 2 + column;
            let center_x = (column as f32 + 0.5) / 2.0 - 0.5;
            let center_y = (row as f32 + 0.5) / 4.0 - 0.5;
            let active = dot_index < level * 2;
            active && (x - center_x).powi(2) + (y - center_y).powi(2) <= 0.055_f32.powi(2)
        }
        AsciiCharset::Standard => match level {
            1 => x * x + (y - 0.28).powi(2) <= 0.075_f32.powi(2),
            2 => (x.abs() <= 0.06 && y.abs() <= 0.32) || (y.abs() <= 0.06 && x.abs() <= 0.3),
            3 => {
                ((x - 0.14).abs() <= 0.05 || (x + 0.14).abs() <= 0.05)
                    || ((y - 0.14).abs() <= 0.05 || (y + 0.14).abs() <= 0.05)
            }
            _ => {
                let distance = (x * x + y * y).sqrt();
                (0.23..=0.38).contains(&distance)
                    || ((0.02..=0.28).contains(&x) && (-0.02..=0.08).contains(&y))
            }
        },
    }
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_cells_and_preserves_per_pixel_alpha() {
        let input = RgbaImageF32::new(
            4,
            4,
            (0..16)
                .map(|index| {
                    let value = index as f32 / 15.0;
                    [value, value, value, value]
                })
                .collect(),
        );
        let output = apply(
            &input,
            AsciiParams {
                cell_size: 4,
                color_mode: AsciiColorMode::Mono,
                ..Default::default()
            },
        );
        assert_ne!(output, input);
        for (source, rendered) in input.pixels().iter().zip(output.pixels()) {
            assert_eq!(source[3], rendered[3]);
        }
    }

    #[test]
    fn all_charset_families_are_deterministic() {
        let input = RgbaImageF32::new(4, 4, vec![[0.75, 0.5, 0.25, 1.0]; 16]);
        for charset in [
            AsciiCharset::Standard,
            AsciiCharset::Block,
            AsciiCharset::Dot,
            AsciiCharset::Binary,
            AsciiCharset::Shade,
            AsciiCharset::Braille,
        ] {
            let params = AsciiParams {
                cell_size: 4,
                charset,
                ..Default::default()
            };
            assert_eq!(apply(&input, params), apply(&input, params));
        }
    }

    #[test]
    fn zero_mix_is_an_exact_passthrough() {
        let input = RgbaImageF32::new(1, 1, vec![[0.2, 0.4, 0.6, 0.8]]);
        assert_eq!(
            apply(
                &input,
                AsciiParams {
                    mix: 0.0,
                    ..Default::default()
                }
            ),
            input
        );
    }
}
