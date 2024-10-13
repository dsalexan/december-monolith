export const TRAIT_SECTIONS = [
  `attributes`,
  `languages`,
  `cultures`,
  `advantages`,
  `perks`,
  `disadvantages`,
  `quirks`,
  `features`,
  `skills`,
  `spells`,
  `equipment`,
  `templates`,
  //
  `modifiers`,
] as const

export type TraitSection = (typeof TRAIT_SECTIONS)[number]
