import { AnyObject } from "tsdef"
import { TraitSection } from "./section"

export { TRAIT_SECTIONS } from "./section"
export type { TraitSection } from "./section"

export interface GCATrait {
  _raw: AnyObject
  id: number
  name: string
  nameext?: string
  section: TraitSection
  attribute: boolean
  active: boolean
  //
  syslevels: number
  baselevel: number
  score?: number
  level?: number
  //
  points?: number
  premodspoints?: number
  // basic cost
  traitCost?: {
    cost?: string
    levelnames?: string[]
    upto?: string
  }
  // equipment cost
  equipmentCost?: {
    basecost: number
    baseweight: number
  }
  //
  //
  modifiers?: GCATraitModifier[]
  modes?: GCATraitMode[]
}

export interface GCATraitModifier {
  id: number
  name: string
  nameext?: string
  gives?: string[]
}

export interface GCATraitMode {
  name: string
  acc?: string
  damage?: string
  dmg?: string
  damagebasedon?: string
  damtype?: string
  rangehalfdam?: string
  rangemax?: string
  reachbasedon?: string
  rcl?: string
  rof?: string
  skillused: string
  minimode_damage?: string
  minimode_damtype?: string
  minst?: string
}
