import type Node from "../../node"
import { Recipe, RecipeOptions } from "../recipe"

export interface EnclosureRecipeOptions extends RecipeOptions {}

export class EnclosureRecipe extends Recipe {
  opener: string
  closer: string

  constructor(name: string, prefix: string, opener: string, closer: string, options?: EnclosureRecipeOptions) {
    super(`enclosure`, name, prefix, options)

    this.opener = opener
    this.closer = closer
  }

  characterSet(): string[] {
    return [this.opener, this.closer]
  }

  getRelevant(node: Node, additional?: ([number, number] | number)[]) {
    let relevant = super.getRelevant(node, additional)

    // first and last characters (opener and closer) are the relevant ones
    relevant.splice(0, 0, [node.start, node.start + node.length - 1])

    return relevant
  }
}

export const IMAGINARY = new EnclosureRecipe(`imaginary`, `ι`, `⟨`, `⟩`)
export const PARENTHESIS = new EnclosureRecipe(`parenthesis`, `ρ`, `(`, `)`)
export const BRACES = new EnclosureRecipe(`braces`, `γ`, `{`, `}`)
export const BRACKETS = new EnclosureRecipe(`brackets`, `β`, `[`, `]`)
export const QUOTES = new EnclosureRecipe(`quotes`, `κ`, `"`, `"`)
export const PERCENTAGE = new EnclosureRecipe(`percentage`, `τ`, `%`, `%`)

// WARN: Always update this list when adding a new recipe
export const RECIPES = [IMAGINARY, PARENTHESIS, BRACES, BRACKETS, QUOTES, PERCENTAGE]
export const RECIPES_BY_NAME = RECIPES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

// WARN: Always update this list when adding a new recipe
export const RECIPE_NAMES = [`imaginary`, `parenthesis`, `braces`, `brackets`, `quotes`, `percentage`] as const
export type EnclosureRecipeName = (typeof RECIPE_NAMES)[number]
