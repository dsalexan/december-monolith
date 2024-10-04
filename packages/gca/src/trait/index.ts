export interface GCATrait {
  id: number
  name: string
  nameext?: string
  type: string
  attribute: boolean
  active: boolean
  //
  points?: number
  level?: number
  score?: number
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
}
