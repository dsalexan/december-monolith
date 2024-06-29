import type Node from "../../node"
import { KeyedRecipe, Recipe, RecipeOptions } from "../recipe"

export interface AggregatorRecipeOptions extends RecipeOptions {
  keys?: string[]
}

export type AggregatorRecipeRecognizeFunction = (node: Node) => boolean

/**
 * A aggregator acts in the tree AFTER the initial parsing, probably "aggregating" nodes together
 * Like with functions, reserved|string + space? + parenthesis
 */
export class AggregatorRecipe extends Recipe implements KeyedRecipe {
  recognizeFunction: AggregatorRecipeRecognizeFunction

  // specify a "key" for specific children of the node (i.e.: children in specific indexes)
  // mostly NOT mandatory, but can be used to facilitate human identification of "arguments" for "functions"
  keys?: string[]

  constructor(name: string, prefix: string, recognizeFunction: AggregatorRecipeRecognizeFunction, options?: AggregatorRecipeOptions) {
    super(`aggregator`, name, prefix, options)

    this.recognizeFunction = recognizeFunction
    this.keys = options?.keys
  }

  characterSet() {
    return []
  }

  /**
   * Some syntax recipes have a "clone" function, to facilitate specialization of recipes for different purposes
   */
  clone(name: string, variant: number, recognizeFunction: AggregatorRecipeRecognizeFunction, options?: AggregatorRecipeOptions): AggregatorRecipe {
    const clone = this._clone(name, variant, options)

    return new AggregatorRecipe(clone.name, clone.prefix, recognizeFunction, clone.options)
  }

  key(key: string, node: Node) {
    const isValidKey = this.keys?.includes(key)
    if (!isValidKey) return undefined

    const keyIndex = this.keys.indexOf(key)

    const childNode = node.children[keyIndex]
    if (!childNode) debugger
    if (!childNode) return undefined

    return childNode
  }

  getRelevant(node: Node, additional?: ([number, number] | number)[]) {
    let relevant = super.getRelevant(node, additional)

    // there is any "automatic" way to determine aggregator relevants?
    debugger

    return relevant
  }
}

// TODO: How to inform if "function name" should be a reserved OR a string?
export const FUNCTION = new AggregatorRecipe(`function`, `f`, (node: Node) => {
  debugger
  throw new Error(`Recognize function not implemented for baseline function aggregator`)
})

// WARN: Always update this list when adding a new recipe
export const RECIPES = [FUNCTION]
export const RECIPES_BY_NAME = RECIPES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

// WARN: Always update this list when adding a new recipe
export const RECIPE_NAMES = [`function`] as const
export type AggregatorRecipeName = (typeof RECIPE_NAMES)[number]
