import { z } from "zod"

import { BaseTrait, BaseTraitSchema } from "./base"
import { AbstractTrait, TraitSection } from "./types"
import { TraitModifier, TraitModifierSchema } from "./modifier"
import { TraitEquipment, TraitEquipmentSchema } from "./equipment"
import { TraitAdvantage, TraitAdvantageSchema } from "./advantage"
import { TraitSkill, TraitSkillSchema } from "./skill"
import { TraitPerk, TraitPerkSchema } from "./perk"
import { TraitSpell, TraitSpellSchema } from "./spell"
import { TraitTemplate, TraitTemplateSchema } from "./template"
import { TraitAttribute, TraitAttributeSchema } from "./attribute"
import { TraitQuirk, TraitQuirkSchema } from "./quirk"
import { TraitDisadvantage, TraitDisadvantageSchema } from "./disadvantage"
import { TraitFeature, TraitFeatureSchema } from "./feature"
import { TraitCulture, TraitCultureSchema } from "./culture"
import { TraitLanguage, TraitLanguageSchema } from "./language"

export const TRAIT_PREFIX_TAGS = [`ST`, `AD`, `PE`, `DI`, `QU`, `SK`, `SP`, `TE`, `EQ`, `GR`, `LI`] as const
export type TraitPrefixTag = (typeof TRAIT_PREFIX_TAGS)[number]

export const TRAIT_SCHEMAS = {
  attributes: TraitAttributeSchema,
  languages: TraitLanguageSchema,
  cultures: TraitCultureSchema,
  advantages: TraitAdvantageSchema,
  perks: TraitPerkSchema,
  disadvantages: TraitDisadvantageSchema,
  quirks: TraitQuirkSchema,
  features: TraitFeatureSchema,
  skills: TraitSkillSchema,
  spells: TraitSpellSchema,
  equipment: TraitEquipmentSchema,
  templates: TraitTemplateSchema,
  //
  modifiers: TraitModifierSchema,
} as const

export type TraitDefinition =
  | TraitAttribute
  | TraitLanguage
  | TraitCulture
  | TraitAdvantage
  | TraitPerk
  | TraitDisadvantage
  | TraitQuirk
  | TraitFeature
  | TraitSkill
  | TraitSpell
  | TraitEquipment
  | TraitTemplate
  | TraitModifier

export type SuperchargedTraitData<TDefinition extends TraitDefinition> = TDefinition[`Data`] & {
  fullname: string
}

type rec = Record<string, number>
type rec1 = {
  [P in TraitSection]: z.ZodSchema
}
type rec2 = {
  modifier: typeof TraitModifierSchema
  base: typeof BaseTraitSchema
}

const section0 = `modifier` as TraitSection
//     ^?
const section = `modifier` as TraitModifier[`Section`]
//     ^?
const sec1 = TRAIT_SCHEMAS[section as TraitSection]
//     ^?
