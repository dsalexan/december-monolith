import BaseCharacter from "../../../character"
import { SubTree } from "../../../tree"

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

export interface CharacterData {
  info: CharacterInformation
  transforms: {
    current: string
    list: Record<TransformOverview[`name`], TransformOverview>
  }
  damageTable: DamageTable
}

export default class GURPSCharacter extends BaseCharacter {
  declare system: `GURPS`

  constructor() {
    super()
    this.system = `GURPS`
  }
}
