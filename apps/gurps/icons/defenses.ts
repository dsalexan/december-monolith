import { Defense } from "../src/defenses"

export default {
  defense: `security`,
  //
  block: `security-viking-shield`,
  dodge: `security-man-avoid-evade`,
  parry: `security-rapier`,
  //
  minimal_block: `viking-shield`,
  minimal_dodge: `man-avoid-evade`,
  minimal_parry: `rapier`,
  //
  no_defense: `security-no`,
  no_block: `security-viking-shield-no`,
  no_dodge: `security-man-avoid-evade-no`,
  no_parry: `security-rapier-no`,
} as Record<Defense, string>
