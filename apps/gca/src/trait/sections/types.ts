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
