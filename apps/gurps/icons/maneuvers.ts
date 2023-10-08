import { Maneuver } from "../src/maneuvers"

export default {
  maneuver: `mdi-strategy`,
  //
  do_nothing: `mdi-cancel`,
  // move
  ready: `sword-over-shield`,
  concentrate: `mdi-meditation`,
  wait: `mdi-timer-sand`,
  change_posture: `mdi-help-circle`,
  //
  aim: `target`,
  evaluate: `achilles-heel`,
  feint: `sword-mask`,
  attack: `mdi-sword`,
  move_and_attack: `move-sword`,
  //
  allout_concentrate: `mdi-help-circle`,
  //
  allout_attack: `flaming-sword`,
  aoa_determined: `flaming-sword-plus-2`,
  aoa_double: `flaming-sword-2-times`,
  aoa_feint: `flaming-sword-mask`,
  aoa_strong: `flaming-sword-weight`,
  aoa_suppress: `mdi-help-circle`,
  //
  allout_defense: `medieval-shield`,
  aod_block: `medieval-shield-viking-shield`,
  aod_dodge: `medieval-shield-man-avoid-evade`,
  aod_parry: `medieval-shield-rapier`,
  aod_double: `medieval-shield-2-times`,
  aod_mental: `sword-and-shield-brain`,
} as Record<Exclude<Maneuver, `move`>, string>
// A) Excluding "move" since it is covered in moves.ts

// TODO: Implement maneuvers png export

export const PNG: Record<Maneuver, string> = {
  do_nothing: `man-do-nothing`,
  move: `man-move`,
  ready: `man-ready`,
  concentrate: `man-concentrate`,
  wait: `man-wait`,
  change_posture: `man-change-posture`,
  //
  aim: `man-aim`,
  evaluate: `man-evaluate`,
  feint: `man-feint`,
  attack: `man-attack`,
  move_and_attack: `man-move-and-attack`,
  //
  allout_concentrate: `man-allout-concentrate`,
  //
  allout_attack: `man-allout-attack`,
  aoa_determined: `man-aoa-determined`,
  aoa_double: `man-aoa-double`,
  aoa_feint: `man-aoa-feint`,
  aoa_strong: `man-aoa-strong`,
  aoa_suppress: `man-aoa-supress`,
  //
  allout_defense: `man-allout-defense`,
  aod_block: `man-aod-block`,
  aod_dodge: `man-aod-dodge`,
  aod_parry: `man-aod-parry`,
  aod_double: `man-aod-double`,
  aod_mental: `man-aod-mental`,
}
