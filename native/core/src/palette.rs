#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Oklab {
    pub l: f32,
    pub a: f32,
    pub b: f32,
}

pub fn srgb_to_oklab(rgb: [f32; 3]) -> Oklab {
    let [r, g, b] = rgb.map(srgb_to_linear);
    let l = 0.412_221_46 * r + 0.536_332_55 * g + 0.051_445_995 * b;
    let m = 0.211_903_5 * r + 0.680_699_5 * g + 0.107_396_96 * b;
    let s = 0.088_302_46 * r + 0.281_718_85 * g + 0.629_978_7 * b;
    let [l, m, s] = [l.cbrt(), m.cbrt(), s.cbrt()];
    Oklab {
        l: 0.210_454_26 * l + 0.793_617_8 * m - 0.004_072_047 * s,
        a: 1.977_998_5 * l - 2.428_592_2 * m + 0.450_593_7 * s,
        b: 0.025_904_037 * l + 0.782_771_77 * m - 0.808_675_77 * s,
    }
}

pub fn nearest_palette_index(color: [f32; 3], palette: &[[f32; 3]]) -> Option<usize> {
    let target = srgb_to_oklab(color);
    palette
        .iter()
        .enumerate()
        .map(|(index, candidate)| {
            let candidate = srgb_to_oklab(*candidate);
            let distance = (target.l - candidate.l).powi(2)
                + (target.a - candidate.a).powi(2)
                + (target.b - candidate.b).powi(2);
            (index, distance)
        })
        .min_by(|left, right| left.1.total_cmp(&right.1))
        .map(|(index, _)| index)
}

fn srgb_to_linear(value: f32) -> f32 {
    let value = value.clamp(0.0, 1.0);
    if value <= 0.04045 {
        value / 12.92
    } else {
        ((value + 0.055) / 1.055).powf(2.4)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_palette_color_maps_to_itself() {
        let palette = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
        assert_eq!(nearest_palette_index([0.0, 1.0, 0.0], &palette), Some(1));
    }
}
