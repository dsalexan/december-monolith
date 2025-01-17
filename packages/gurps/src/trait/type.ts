import { TraitSection } from "@december/gca/trait/section"

export const TRAIT_TYPES = [
  `attribute`,
  `language`,
  `culture`,
  `advantage`,
  `perk`,
  `disadvantage`,
  `quirk`,
  `feature`,
  `skill`,
  `spell`,
  `equipment`,
  `template`,
  //
  `modifier`,
  //
  `technique`,
] as const

export type TraitType = (typeof TRAIT_TYPES)[number]

export function fromGCASection(section: TraitSection): TraitType {
  if (section === `attributes`) return `attribute`
  if (section === `languages`) return `language`
  if (section === `cultures`) return `culture`
  if (section === `advantages`) return `advantage`
  if (section === `perks`) return `perk`
  if (section === `features`) return `feature`
  if (section === `disadvantages`) return `disadvantage`
  if (section === `quirks`) return `quirk`
  if (section === `skills`) return `skill`
  if (section === `spells`) return `spell`
  if (section === `templates`) return `template`
  if (section === `equipment`) return `equipment`
  if (section === `modifiers`) return `modifier`

  throw new Error(`Type not implemented for section: ${section}`)
}

export function toTag(type: TraitType) {
  if (type === `attribute`) return `ST`
  if (type === `language`) return `LA`
  if (type === `culture`) return `CU`
  if (type === `advantage`) return `AD`
  if (type === `perk`) return `PE`
  if (type === `feature`) return `FE`
  if (type === `disadvantage`) return `DI`
  if (type === `quirk`) return `QU`
  if (type === `skill`) return `SK`
  if (type === `spell`) return `SP`
  if (type === `template`) return `TE`
  if (type === `equipment`) return `EQ`

  throw new Error(`Tag not implemented for type: ${type}`)
}

export function fromTag(tag: string): TraitType {
  if (tag === `ST`) return `attribute`
  if (tag === `LA`) return `language`
  if (tag === `CU`) return `culture`
  if (tag === `AD`) return `advantage`
  if (tag === `PE`) return `perk`
  if (tag === `FE`) return `feature`
  if (tag === `DI`) return `disadvantage`
  if (tag === `QU`) return `quirk`
  if (tag === `SK`) return `skill`
  if (tag === `SP`) return `spell`
  if (tag === `TE`) return `template`
  if (tag === `EQ`) return `equipment`

  throw new Error(`Type not implemented for tag: ${tag}`)
}
