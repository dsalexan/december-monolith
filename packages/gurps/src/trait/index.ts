import { isEmpty } from "lodash"
// import IGURPSTraitMode from "./mode"
import { TraitType, toTag } from "./type"

// export * as Mode from "./mode"
export * as Type from "./type"

export { isNameExtensionValid, fullName, getAliases, isAlias } from "./utils"
export type { AliasOptions } from "./utils"

// export type { default as IGURPSTraitMode, IGURPSTraitModeStrength } from "./mode"
export { makeGURPSTraitEnvironment } from "./environment"

// export type { IGURPSTrait } from "./traits"

export type { IGURPSTraitOrModifier, IGURPSBaseTrait, IGURPSTrait, IGURPSAttribute, IGURPSSkillOrSpellOrTechnique, IGURPSEquipment, IGURPSGeneralTrait, IGURPSModifier } from "./definitions/generic"
