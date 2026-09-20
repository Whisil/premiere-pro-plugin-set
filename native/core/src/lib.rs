pub mod barrel_blur;
pub mod bloom;
pub mod chromatic_aberration;
pub mod dither;
pub mod dot_matrix;
pub mod eight_bit;
pub mod frame_gate;
pub mod halftone;
pub mod palette;
pub mod rgb_shift;

#[derive(Clone, Debug, PartialEq)]
pub struct RgbaImageF32 {
    width: u32,
    height: u32,
    pixels: Vec<[f32; 4]>,
}

impl RgbaImageF32 {
    pub fn new(width: u32, height: u32, pixels: Vec<[f32; 4]>) -> Self {
        assert_eq!(pixels.len(), width as usize * height as usize);
        Self {
            width,
            height,
            pixels,
        }
    }

    pub fn width(&self) -> u32 {
        self.width
    }
    pub fn height(&self) -> u32 {
        self.height
    }
    pub fn pixels(&self) -> &[[f32; 4]] {
        &self.pixels
    }
    pub fn pixels_mut(&mut self) -> &mut [[f32; 4]] {
        &mut self.pixels
    }

    pub fn get_clamped(&self, x: i32, y: i32) -> [f32; 4] {
        let x = x.clamp(0, self.width.saturating_sub(1) as i32) as u32;
        let y = y.clamp(0, self.height.saturating_sub(1) as i32) as u32;
        self.pixels[(y * self.width + x) as usize]
    }
}
