import uuid from "@december/utils/uuid"

import { ICharacter } from "@december/system"
import { Node } from "@december/tree"
import { GCATrait } from "../trait"
import { AnyObject } from "tsdef"

export default class GCACharacter implements ICharacter {
  declare system: `GCA`
  _raw: AnyObject
  id: string
  //
  data: CharacterGeneralData
  traits: Record<string, GCATrait>
  stats: Record<string, GCATrait>

  constructor(id?: string) {
    this.id = id ?? uuid()
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
  name: string
  //
  info: CharacterInformation
  transforms: CharacterTransforms
  damageTable: DamageTable
  //
  campaign: {
    totalMoney: number
  }
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
