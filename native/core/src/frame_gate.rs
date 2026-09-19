use serde::{Deserialize, Serialize};

pub const MAX_PATTERN_FRAMES: u32 = 12;
pub const DEFAULT_FIVE_FRAME_MASK: u16 = 0b1_0101;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum GateMode {
    Head,
    Tail,
    Both,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct FrameGateParams {
    pub mode: GateMode,
    pub head_length: u32,
    pub head_mask: u16,
    pub tail_length: u32,
    pub tail_mask: u16,
}

impl Default for FrameGateParams {
    fn default() -> Self {
        Self {
            mode: GateMode::Both,
            head_length: 5,
            head_mask: DEFAULT_FIVE_FRAME_MASK,
            tail_length: 5,
            tail_mask: DEFAULT_FIVE_FRAME_MASK,
        }
    }
}

impl FrameGateParams {
    pub fn normalized(self) -> Self {
        let valid_bits = (1_u16 << MAX_PATTERN_FRAMES) - 1;
        Self {
            head_length: self.head_length.clamp(0, MAX_PATTERN_FRAMES),
            tail_length: self.tail_length.clamp(0, MAX_PATTERN_FRAMES),
            head_mask: self.head_mask & valid_bits,
            tail_mask: self.tail_mask & valid_bits,
            ..self
        }
    }

    pub fn is_visible(self, frame_index: u32, total_frames: u32) -> bool {
        if total_frames == 0 || frame_index >= total_frames {
            return false;
        }
        let params = self.normalized();
        let use_head = matches!(params.mode, GateMode::Head | GateMode::Both);
        let use_tail = matches!(params.mode, GateMode::Tail | GateMode::Both);

        // Split short clips between head and tail so their regions never overlap.
        let head_budget = if use_head && use_tail {
            total_frames.div_ceil(2)
        } else {
            total_frames
        };
        let head_span = if use_head {
            params.head_length.min(head_budget)
        } else {
            0
        };
        let tail_budget = total_frames.saturating_sub(head_span);
        let tail_span = if use_tail {
            params.tail_length.min(tail_budget)
        } else {
            0
        };

        if frame_index < head_span {
            return bit_is_set(params.head_mask, frame_index);
        }
        let distance_from_end = total_frames - 1 - frame_index;
        if distance_from_end < tail_span {
            return bit_is_set(params.tail_mask, distance_from_end);
        }
        true
    }
}

fn bit_is_set(mask: u16, index: u32) -> bool {
    mask & (1_u16 << index) != 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_pattern_hides_second_and_fourth_frames_at_both_ends() {
        let params = FrameGateParams::default();
        let visibility: Vec<bool> = (0..14).map(|frame| params.is_visible(frame, 14)).collect();
        assert_eq!(
            visibility,
            vec![
                true, false, true, false, true, true, true, true, true, true, false, true, false,
                true
            ]
        );
    }

    #[test]
    fn short_clips_are_split_without_overlap() {
        let params = FrameGateParams::default();
        let visibility: Vec<bool> = (0..7).map(|frame| params.is_visible(frame, 7)).collect();
        assert_eq!(
            visibility,
            vec![true, false, true, false, true, false, true]
        );
    }

    #[test]
    fn pattern_is_frame_rate_independent() {
        let params = FrameGateParams::default();
        for _fps in [23.976, 25.0, 29.97, 30.0, 60.0] {
            assert!(!params.is_visible(1, 30));
            assert!(!params.is_visible(3, 30));
        }
    }
}
