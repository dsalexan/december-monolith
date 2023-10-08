export const MOVES = [`move_none`, `move_one`, `move_step`, `move_one_third`, `move_half`, `move_two_thirds`, `move_full`, `move_sprint`] as const
export type Move = (typeof MOVES)[number]

export const MOVE_DISPLAY = {
  move_none: `none`,
  move_one: `1`,
  move_step: `step`,
  move_one_third: `×1/3`,
  move_half: `half`,
  move_two_thirds: `×2/3`,
  move_full: `full`,
  move_sprint: `sprint`,
} as Record<Move, string>
