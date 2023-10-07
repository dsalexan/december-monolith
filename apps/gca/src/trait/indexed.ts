export type TraitSection =
  | `attributes`
  | `languages`
  | `cultures`
  | `advantages`
  | `perks`
  | `disadvantages`
  | `quirks`
  | `features`
  | `skills`
  | `spells`
  | `equipment`
  | `templates`
  | `modifiers`

export const SECTIONS = [
  undefined,
  `attributes`,
  `languages`,
  `cultures`,
  `advantages`,
  `perks`,
  `disadvantages`,
  `quirks`,
  `features`,
  `skills`,
  `spells`,
  `equipment`,
  `templates`,
  `modifiers`,
] as TraitSection[]

export default class IndexedTrait {
  name: string
  nameext: string
  section: TraitSection
  group?: string // only for modifiers, qualify the target trait for the modifier
  category: string[]
  meta: string[]

  _row: number
  _id: string // na pratica é o indice to trait dentro do arquivo do fstidx, what i call "GCA ID"
  _raw?: string

  get fullname() {
    return this.nameext === `` || this.nameext === undefined ? this.name : `${this.name} (${this.nameext})`
  }

  constructor() {
    this.name = ``
    this.nameext = ``
    this.section = null!
    this.group = undefined
    this.category = []
    this.meta = []

    this._row = -1
    this._id = null!
  }

  static General(line: string[], index: number) {
    const trait = new IndexedTrait()

    const sectionNumber = parseInt(line[2].trim())

    if (isNaN(sectionNumber) || sectionNumber > 12) debugger

    trait.name = line[0].trim().replaceAll(/[\s]+/g, ` `).trim()
    // TODO: Deal with<'''Barnstormer'' Biplane'>
    trait.nameext = line[1].trim().replaceAll(/[\s]+/g, ` `).trim()
    trait.section = SECTIONS[sectionNumber]
    const U_2 = line[2].trim() // TODO: Find out what trait is
    const U_3 = line[3].trim() // TODO: Find out what trait is
    const U_4 = line[4].trim() // TODO: Find out what trait is
    trait.meta = line[5].trim().split(/ *, */) // seems to be some derivation from categories
    trait.category = line[6].trim().split(/ *, */)
    if (line[7] === undefined) debugger
    trait._id = line[7].trim()
    // 8 e sempre 1

    trait._row = index

    if (trait.section === undefined) debugger

    return trait
  }

  static Modifier(line: string[], index: number) {
    const trait = new IndexedTrait()

    const U_0 = line[0].trim()
    trait.name = line[1].trim().replaceAll(/[\s]+/g, ` `).trim()
    trait.nameext = line[2].trim().replaceAll(/[\s]+/g, ` `).trim()
    trait.section = `modifiers`
    trait.group = line[3].trim()
    if (trait.group === ``) trait.group = undefined
    trait._raw = line[4].trim()
    if (trait._raw === ``) trait._raw = undefined

    trait._row = index
    trait._id = `modifier-${index}`

    return trait
  }
}
