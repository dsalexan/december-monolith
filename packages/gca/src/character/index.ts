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
  data: CharacterData
  traits: Record<string, GCATrait>
  stats: Record<string, GCATrait>

  constructor(id?: string) {
    this.id = id ?? uuidv4()
  }
}

export interface CharacterData {
  info: CharacterInformation
  transforms: {
    current: string
    list: Record<TransformOverview[`name`], TransformOverview>
  }
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

export type DamageTable = Record<number, { thr: SubTree; sw: SubTree }>
