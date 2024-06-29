import type Node from "../../node"
import { Recipe, RecipeOptions } from "../recipe"

export interface PrimitiveRecipeOptions extends RecipeOptions {}

export class PrimitiveRecipe extends Recipe {
  constructor(name: string, prefix: string, options?: PrimitiveRecipeOptions) {
    super(`primitive`, name, prefix, options)
  }

  characterSet(): string[] {
    return []
  }
}

export const NIL = new PrimitiveRecipe(`nil`, `⌀`)
export const ROOT = new PrimitiveRecipe(`root`, `root`)
export const STRING = new PrimitiveRecipe(`string`, `x`)
export const LIST = new PrimitiveRecipe(`list`, `l`)

// WARN: Always update this list when adding a new recipe
export const RECIPES = [NIL, STRING, LIST]
export const RECIPES_BY_NAME = RECIPES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

// WARN: Always update this list when adding a new recipe
export const RECIPE_NAMES = [`root`, `string`, `nil`, `list`] as const
export type PrimitiveRecipeName = (typeof RECIPE_NAMES)[number]
