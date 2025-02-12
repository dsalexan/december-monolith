import { isEmpty } from "lodash"
// import IGURPSTraitMode from "./mode"
import { TraitType, toTag } from "./type"

// export * as Mode from "./mode"
export * as Type from "./type"
export type { TraitType } from "./type"

export { isNameExtensionValid, fullName, getAliases, isAlias, isAttributeAlias, aliasToReference } from "./utils"
export type { AliasOptions } from "./utils"

export type { TraitSelector, TraitSelectorSubcriteria } from "./selector"
export { TRAIT_SELECTOR, TRAIT_SELECTOR_SUBCRITERIA, parseSelectorNotation } from "./selector"

// export type { default as IGURPSTraitMode, IGURPSTraitModeStrength } from "./mode"
export { makeGURPSTraitEnvironment } from "./environment"

// export type { IGURPSTrait } from "./traits"

export type {
  IGURPSTraitOrModifier,
  IGURPSBaseTrait,
  IGURPSTrait,
  IGURPSAttribute,
  IGURPSSkillOrSpellOrTechnique,
  IGURPSEquipment,
  IGURPSGeneralTrait,
  IGURPSModifier,
  IGURPSMode,
  IGURPSTraitExpression,
  IGURPSTraitDefaults,
  GeneralTraitType,
} from "./definitions/generic"
