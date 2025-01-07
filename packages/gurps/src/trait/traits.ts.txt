import IGURPSTraitMode from "./mode"
import { TraitType } from "./type"

export interface IGURPSTrait {
  name: string
  nameExtension?: string
  type: TraitType
  active: boolean
  //
  score?: number
  level?: number
  //
  points: number
  // cost: TraitCost
  //
  //
  modes: IGURPSTraitMode[]
}

// Languages, Cultures, Advantages, Perks, Features, Disadvantages, Quirks, and Templates; Modifiers
// Advantages, Features, Disadvantages, Features, Templates, Modifiers
// export interface IGURPSTraitCASEA extends IGURPSTrait {
//   type: `language` | `culture` | `advantage` | `perk` | `feature` | `disadvantage` | `quirk` | `template` | `modifier`
//   //
//   level: {
//     base: number
//     system: number
//     total: number
//     // UpTo()
//     maximum?: number
//     isLimitingTotal?: boolean // if true this maximum applies AFTER bonuses too (otherwise bonusus could expand the maximum)
//   }
// }

export interface IGURPSTraitSkillsAndSpells extends IGURPSTrait {
  type: `spell` | `skill`
  //
  // UpTo()
  maximumSpentPoints?: number
}
