import { Move } from "../src/move"

export default {
  move: `move`,
  //
  move_none: `no-move`,
  move_one: `move-step`,
  move_step: `move-step`,
  move_one_third: `move_one_third`,
  move_half: `move_half`,
  move_two_thirds: `move_two_thirds`,
  move_full: `move`,
  move_sprint: `sprint`,
} as Record<Move, string>
