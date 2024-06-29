import { z } from "zod"

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

export const TraitSectionsSchema = z.enum(TRAIT_SECTIONS)

export type TraitSection = z.infer<typeof TraitSectionsSchema>

export declare abstract class AbstractTrait<TSection extends TraitSection = TraitSection, TData = any> {
  readonly Data: TData
  readonly Section: TSection
}

export function toTag(type: TraitSection) {
  if (type === `attributes`) return `ST`
  if (type === `languages`) return `LA`
  if (type === `cultures`) return `CU`
  if (type === `advantages`) return `AD`
  if (type === `perks`) return `PE`
  if (type === `features`) return `FE`
  if (type === `disadvantages`) return `DI`
  if (type === `quirks`) return `QU`
  if (type === `skills`) return `SK`
  if (type === `spells`) return `SP`
  if (type === `templates`) return `TE`
  if (type === `equipment`) return `EQ`

  // ERROR: Tag not implemented for type
  debugger
  return type
}
