import { MaybeNull } from "tsdef"

import { CharacterInformation, CharacterTransforms, CharacterGeneralData as GCACharacterGeneralData } from "@december/gca/character"
import { Reference } from "@december/utils/access"
import { SubTree } from "@december/tree"

import IGURPSTrait from "../trait"

export default interface IGURPSCharacter {
  name: string
  //
  trait(idOrReference: string | Reference<`alias` | `id`>): MaybeNull<IGURPSTrait>
  stat(idOrReference: string | Reference<`alias` | `id`>): MaybeNull<IGURPSTrait>
  //
  general: {
    info: CharacterInformation
    transforms: CharacterTransforms
    damageTable: DamageTable
  }
}

export type DamageTable = Record<number, { thr: SubTree; sw: SubTree }>
