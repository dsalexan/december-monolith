import { v4 as uuidv4 } from "uuid"

import { ICharacter } from "@december/system"
import { SubTree } from "@december/tree"
import { GCATrait } from "../trait"

export default class GCACharacter implements ICharacter {
  declare system: `GCA`
  id: string
  //
  name: string
  //
  general: CharacterGeneralData
  traits: Record<string, GCATrait>
  stats: Record<string, GCATrait>

  constructor(id?: string) {
    this.id = id ?? uuidv4()
  }

  get allTraits() {
    const o = Object.values(this.traits)
      .map(trait => ({
        type: `trait`,
        trait,
      }))
      .concat(
        Object.values(this.stats).map(trait => ({
          type: `stat`,
          trait,
        })),
      )

    return o as {
      type: `trait` | `stat`
      trait: GCATrait
    }[]
  }
}

export interface CharacterGeneralData {
  info: CharacterInformation
  transforms: CharacterTransforms
  damageTable: DamageTable
}

export interface CharacterInformation {
  player: string
  body: string
  vitals: {
    race: string
    height: string
    weight: string
    age: number
    appearance: string
  }
}

export interface TransformOverview {
  name: string
  points: number
  traits: { id: number; name: string }[]
}

export interface CharacterTransforms {
  current: string
  list: Record<TransformOverview[`name`], TransformOverview>
}

export type DamageTable = Record<number, { thr: { base: number; modifier: number }; sw: { base: number; modifier: number } }>
