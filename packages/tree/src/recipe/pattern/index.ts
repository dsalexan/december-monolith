import { Recipe, RecipeOptions } from "../recipe"

export interface PatternRecipeOptions extends RecipeOptions {}

export interface SyntaxPattern {
  pattern: RegExp
  key: string
}

/**
 * A Pattern is mostly like a separator, breaking a Node's content into smaller pieces
 * The main difference is that the separators are not, necessarely, the same character. They are actually regex patterns, and each "piece" can be arranged in a map (although, internally, they are still a list)
 */
export class PatternRecipe extends Recipe {
  patterns: SyntaxPattern[]

  constructor(name: string, prefix: string, patterns: Record<string, RegExp>, options?: PatternRecipeOptions) {
    super(`pattern`, name, prefix, options)

    this.patterns = Object.entries(patterns).map(([key, pattern]) => ({ key, pattern }))
  }

  characterSet(): string[] {
    return []
  }

  /**
   * Some syntax recipes have a "clone" function, to facilitate specialization of recipes for different purposes
   */
  clone(name: string, variant: number, patterns: Record<string, RegExp>, options?: PatternRecipeOptions): PatternRecipe {
    const clone = this._clone(name, variant, options)

    return new PatternRecipe(clone.name, clone.prefix, patterns, clone.options)
  }
}

// TODO: Baseline pattern has no patterns, so NOTHING would happen. Remember to throw something in tree, warning the user to clone baseline into something usable
export const RESERVED = new PatternRecipe(`reserved`, `#`, {})

// WARN: Always update this list when adding a new recipe
export const RECIPES = [RESERVED]
export const RECIPES_BY_NAME = RECIPES.reduce((acc, recipe) => ({ ...acc, [recipe.name]: recipe }), {})

// WARN: Always update this list when adding a new recipe
export const RECIPE_NAMES = [`reserved`] as const
export type PatternRecipeName = (typeof RECIPE_NAMES)[number]
