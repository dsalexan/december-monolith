import { CharacterData, CharacterDataSchema, Trait } from "./base"
import { EventEmitter } from "@billjs/event-emitter"
import { z } from "zod"
import CER from "./cer"
import { isNilOrEmpty } from "../../../../packages/utils/src"
import { give } from "./trait"
import { calculate, setup } from "./trait/base"

export const NO_TRANSFORM = Symbol.for(`GCA5__NO_TRANSFORM`)

export type CharacterOptions = {
  transform: string
}

export default class CharacterSheet extends EventEmitter {
  schema: z.Schema
  _data!: CharacterData

  attacks: any[] = []

  get data(): CharacterData {
    return this._data
  }

  constructor(schema: z.Schema) {
    super()

    this.schema = schema
  }

  getAttributes() {
    const attributes = Object.values(this.data.traits).filter(trait => trait.type === `Attributes`)

    return attributes
  }

  getTraits(options: Partial<CharacterOptions> = {}) {
    const currentTransform = (this.data.transforms.current ?? NO_TRANSFORM) as string | symbol

    if (currentTransform === NO_TRANSFORM) return Object.values(this.data.traits)

    const transform = this.data.transforms.list.find(t => t.name === currentTransform)
    if (!transform) debugger

    const transformTraits = transform?.items.map(({ id, name }) => this.data.traits[id])
    const traits = [] as Trait[]
    const stack = [...(transformTraits ?? [])]
    while (stack.length) {
      const current = stack.shift()!
      if (!current) continue

      traits.push(current)

      const childkeys = (current._.childkeylist?.[0] ?? ``).split(/ ?, ?/).filter(s => s !== ``) as string[]
      const children = childkeys.map(key => {
        const id = parseInt(key.slice(1))
        return this.data.traits[id]
      })

      for (const child of children) stack.push(child)
    }

    return traits
  }

  getTrait(tag: string, traitName: string): Trait | null {
    let sourceList = [] as Trait[]
    if (tag === `ST`) {
      sourceList = this.getAttributes()
    } else {
      // ERROR: Unimplemented tag
      debugger
    }

    return sourceList.find(trait => trait.name === traitName) ?? null
  }

  setData(data: CharacterData) {
    const result = this.schema.safeParse(data)

    if (!result.success) {
      const errors = result.error.errors

      debugger
    }

    this._data = data
  }

  calculateCER() {
    return CER.getInstance().calculate(this)
  }

  calculate(options: Partial<CharacterOptions> = {}) {
    const traits = this.getTraits(options)

    this._setup(options)
    this._calculate(options)
    this._give(options)
    debugger

    // mode === roll which the traits depends to activate/use
    const rollDependantTraits = traits.filter(trait => trait.modes?.some(mode => mode.name !== ``))

    const attacks = rollDependantTraits.filter(trait => trait.modes?.some(mode => !isNilOrEmpty(mode.dmg)))
  }

  _setup(options: Partial<CharacterOptions> = {}) {
    const traits = this.getTraits(options)

    for (const trait of traits) {
      setup(this, trait)
    }
  }

  _calculate(options: Partial<CharacterOptions> = {}) {
    const traits = this.getTraits(options)

    for (const trait of traits) {
      calculate(this, trait)
    }
  }

  _give(options: Partial<CharacterOptions> = {}) {
    const traits = this.getTraits(options)
    const attributes = this.getAttributes()

    const givingTraits = traits.filter(trait => trait.modifiers?.some(modifier => modifier.gives?.length))

    for (const givingTrait of givingTraits) {
      give(this, givingTrait)
    }
  }
}
