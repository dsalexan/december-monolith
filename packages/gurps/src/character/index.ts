import { AnyObject, MaybeNull } from "tsdef"

import { CharacterInformation, CharacterTransforms, CharacterGeneralData as GCACharacterGeneralData } from "@december/gca/character"
import { Reference } from "@december/utils/access"
import { Node } from "@december/tree"

import { IGURPSTrait } from "../trait"

export default interface IGURPSCharacter {
  name: string
  //
  info: CharacterInformation
  transforms: CharacterTransforms
  damageTable: DamageTable
  //
  encumbranceLevel: number
  equipmentCost: number
  currentLoad: number
  //
  campaign: {
    totalMoney: number
  }
}

export type DamageTable = Record<number, { thr: Node; sw: Node }>
