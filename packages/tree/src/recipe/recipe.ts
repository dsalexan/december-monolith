import { toSuperscript } from "@december/utils"

import type Node from "../node"

export const TYPES = [`primitive`, `enclosure`, `separator`, `aggregator`, `pattern`] as const

export type Type = (typeof TYPES)[number]

// export const ENCLOSURE_NAMES = [`parenthesis`, `braces`, `brackets`, `quotes`, `percentage`]
// export const NAMES = [...ENCLOSURE_NAMES]

// export type EnclosureName = (typeof ENCLOSURE_NAMES)[number]
// export type Name<TType extends Type = Type> = TType extends `enclosure` ? EnclosureName : TType extends `math` ? never : (typeof NAMES)[number]

export interface RecipeOptions {
  priority?: number
  restrictions?: {
    children?: string[]
    parents?: string[]
    grandparents?: string[]
  }
  tags?: string[]
}

export interface RecipeClone {
  name: string
  prefix: string
  options: RecipeOptions
}

export const RECIPE_RESTRICTIONS = [`children`, `parents`, `grandparents`] as const
export type RecipeRestriction = (typeof RECIPE_RESTRICTIONS)[number]

export class Recipe {
  options: RecipeOptions // keeping it just to facilitate cloning

  type: Type
  name: string

  prefix: string
  priority?: number // priority is only relevant when reorganizing child nodes, highest priority is reorganized first
  tags: string[] = []

  restrictions: {
    // escape parsing when one of these recipes is found inside // TODO: WTF this means????
    children: string[] // escapeChildren

    // only parse if parent node is one of these recipes
    parents: string[] // allowedParents
    grandparents: string[] // TODO: Ncessary?
  }

  constructor(type: Type, name: string, prefix: string, options: RecipeOptions = {}) {
    const {
      priority = undefined, //
      restrictions: { children = [], parents = [], grandparents = [] } = { children: [], parents: [], grandparents: [] },
      tags = [],
    } = options

    this.options = options

    this.type = type
    this.name = name

    this.prefix = prefix

    if (priority !== undefined) this.priority = priority
    this.tags = [...tags]

    this.restrictions = {
      children: [...children],
      parents: [...parents],
      grandparents: [...grandparents],
    }
  }

  get clonedFrom() {
    const name = this.name.split(`_`)
    const clonings = name.length - 1

    return name.slice(0, clonings).join(`_`)
  }

  get base() {
    const name = this.name.split(`_`)

    return name[0]
  }

  hasRestriction(restriction?: `parents` | `children` | `grandparents`) {
    if (restriction === undefined) return RECIPE_RESTRICTIONS.some(restriction => this.hasRestriction(restriction))

    const _restriction = this.restrictions[restriction]
    if (_restriction) return _restriction.length > 0

    throw new Error(`Invalid constraint: ${restriction}`)
  }

  /** Validate a restriction against a list of recipes. The name or type of EVERY recipe is list should be contained in one of the restriction categories */
  validateRestriction(restriction: RecipeRestriction, recipes: Recipe[]) {
    const _restriction = this.restrictions[restriction]
    if (_restriction) {
      if (_restriction.length === 0) return true

      const invalidRecipes = [] as Recipe[]
      for (const recipe of recipes) {
        let isValid = false

        const hasName = _restriction.includes(recipe.name)
        if (hasName) isValid = true
        else {
          const hasType = _restriction.includes(recipe.type)
          if (hasType) isValid = true
        }

        if (!isValid) invalidRecipes.push(recipe)
      }

      return invalidRecipes.length === 0
    }

    throw new Error(`Invalid constraint: ${restriction}`)
  }

  characterSet(): string[] {
    throw new Error(`Recipe "${this.type}:${this.name}" does not have a set (if that is intentional, override this method on specialization)`)
  }

  getRelevant(node: Node, additional?: ([number, number] | number)[]) {
    // ERROR: Relevant is usually automatically set
    if (additional) debugger

    // by default a recipe doesnt have any relevant indexes
    // this is implemented on specializations
    return []
  }

  /**
   * Some syntax recipes have a "clone" function, to facilitate specialization of recipes for different purposes
   */
  _clone(name: string, variant: number, newOptions: RecipeOptions = {}): RecipeClone {
    const options: RecipeOptions = {}
    if (this.priority !== undefined) options[`priority`] = this.priority
    if (this.tags.length > 0) options[`tags`] = [...this.tags]

    for (const restriction of RECIPE_RESTRICTIONS) {
      if (this.restrictions[restriction].length > 0) {
        if (options[`restrictions`] === undefined) options[`restrictions`] = {}
        options[`restrictions`] = { ...options[`restrictions`], [restriction]: [...this.restrictions[restriction]] }
      }
    }

    return { name: `${this.name}_${name}`, prefix: `${this.prefix}${toSuperscript(variant)}`, options: { ...options, ...newOptions } }
  }
}

export interface KeyedRecipe {
  keys?: string[]

  key(key: string, node: Node): Node | undefined
}
