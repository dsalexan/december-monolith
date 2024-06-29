import type Node from "../../node"
import { Recipe, RecipeOptions } from "../recipe"

export interface SeparatorRecipeOptions extends RecipeOptions {}

export class SeparatorRecipe extends Recipe {
  character: string

  constructor(name: string, prefix: string, character: string, options?: SeparatorRecipeOptions) {
    super(`separator`, name, prefix, options)

    this.character = character
  }

  characterSet(): string[] {
    return [this.character]
  }

  getRelevant(node: Node, additional?: ([number, number] | number)[]) {
    let relevant = super.getRelevant(node, additional)

    // when closed, a separator node has only one relevant, itself (since every instance is later reorganized into a single node)
    relevant.splice(0, 0, node.start)

    return relevant
  }
}

export const COMMA = new SeparatorRecipe(`comma`, `C`, `,`, { priority: 2 })
export const COLON = new SeparatorRecipe(`colon`, `N`, `:`, { priority: 3 })
export const PIPE = new SeparatorRecipe(`pipe`, `P`, `|`, { priority: 4 })

// WARN: Always update this list when adding a new recipe
export const RECIPES = [COMMA, COLON, PIPE]
export const RECIPES_BY_NAME = RECIPES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

// WARN: Always update this list when adding a new recipe
export const RECIPE_NAMES = [`comma`, `colon`, `pipe`] as const
export type SeparatorRecipeName = (typeof RECIPE_NAMES)[number]
