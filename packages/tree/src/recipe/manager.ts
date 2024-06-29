import { startCase, isString } from "lodash"
import { Recipe, Type } from "./recipe"
import * as Enclosure from "./enclosure"
import * as Separator from "./separator"
import * as Primitive from "./primitive"
import * as Aggregator from "./aggregator"
import * as Pattern from "./pattern"

/**
 * parse -> inline text into tree
 * horizontal -> break nodes into smaller pieces
 *    it DOES NOT change the tree vertical structure, never addindg height, only adding leaf siblings
 *    ex.: detecting reserved tokens in string nodes (breaks a string node into multiple string/reserved/nil nodes)
 * vertical -> aggregate nodes into other nodes when necessary
 *    ex.: aggregating reserved + parenthesis into a function (adds an addional node for function)
 */
export const STAGES = [`parse`, `horizontal`, `vertical`] as const
export type Stage = (typeof STAGES)[number]
export type RecipeName = Enclosure.EnclosureRecipeName | Separator.SeparatorRecipeName | Primitive.PrimitiveRecipeName | Aggregator.AggregatorRecipeName | Pattern.PatternRecipeName

export const DEFAULT_RECIPES = [...Enclosure.RECIPE_NAMES, ...Separator.RECIPE_NAMES, ...Primitive.RECIPE_NAMES, ...Aggregator.RECIPE_NAMES, ...Pattern.RECIPE_NAMES]

export function getRecipeByName(recipeName: RecipeName) {
  return Primitive.RECIPES_BY_NAME[recipeName] || Enclosure.RECIPES_BY_NAME[recipeName] || Separator.RECIPES_BY_NAME[recipeName] || Aggregator.RECIPES_BY_NAME[recipeName] || Pattern.RECIPES_BY_NAME[recipeName]
}

export function getRecipeStage(recipe: Recipe): Stage {
  if ([`enclosure`, `separator`, `primitive`].includes(recipe.type)) return `parse`
  if ([`pattern`].includes(recipe.type)) return `horizontal`
  if ([`aggregator`].includes(recipe.type)) return `vertical`

  throw new Error(`Recipe stage not implemented for "${recipe.type}:${recipe.name}"`)
}

export default class RecipeManager {
  recipes: Record<string, Recipe>

  // pre indexed list of syntatic characters
  characters: string[]

  // indexes
  _byStage: Record<Stage, string[]>
  _byType: Record<Type, string[]>
  _byCharacter: Record<string, string[]> = {}
  //    applicable only for enclosures actually
  _byOpener: Record<string, string[]> = {}
  _byCloser: Record<string, string[]> = {}

  constructor() {
    this.recipes = {}

    // initialize indexes
    this._byStage = {} as Record<Stage, string[]>
    for (const stage of STAGES) this._byStage[stage] = []
    this._byType = {} as Record<Type, string[]>
  }

  // #region UTILS
  has(recipe: RecipeName) {
    return this.recipes[recipe] !== undefined
  }

  get(recipe: RecipeName) {
    return this.recipes[recipe] ?? null
  }

  add(...recipes: (Recipe | RecipeName)[]): void {
    for (const recipe of recipes) {
      this._add(recipe)
    }
  }

  by(index: `stage`, stage: Stage): Recipe[]
  by(index: `type`, type: Type): Recipe[]
  by(index: `character` | `opener` | `closer`, character: string): Recipe[]
  by(index: `stage` | `type` | `character` | `opener` | `closer`, value: string | Type | Stage) {
    const property = `_by${startCase(index)}` as const

    const names = (this[property][value] ?? []) as string[]
    const recipes = names.map(recipeName => this.recipes[recipeName])

    // ERROR: There should always be a recipe for each name
    if (recipes.some(recipe => !recipe)) debugger

    return recipes
  }

  byType(type: Type) {
    return this.by(`type`, type)
  }

  byCharacter(character: string) {
    return this.by(`character`, character)
  }

  byOpener(opener: string) {
    return this.by(`opener`, opener)
  }

  byCloser(closer: string) {
    return this.by(`closer`, closer)
  }
  // #endregion

  _add(recipeOrRecipeName: Recipe | RecipeName) {
    // parse args
    let recipe: Recipe = recipeOrRecipeName as Recipe
    if (isString(recipeOrRecipeName)) recipe = getRecipeByName(recipeOrRecipeName)

    // ERROR: Recipe name is not indexed (probably was not added in <Specialization.RECIPE_NAMES) OR a custom recipe was added by name
    if (!recipe) debugger

    // ERROR: Recipe already exists
    if (this.recipes[recipe.name]) debugger
    this.recipes[recipe.name] = recipe

    // recipes are only indexes on add
    if (!this._byType[recipe.type]) this._byType[recipe.type] = []
    this._byType[recipe.type].push(recipe.name)
    this._byStage[getRecipeStage(recipe)].push(recipe.name)

    const set = recipe.characterSet()
    for (const character of set) {
      if (!this._byCharacter[character]) this._byCharacter[character] = []
      if (!this._byCharacter[character].includes(recipe.name)) this._byCharacter[character].push(recipe.name)
    }

    this.characters = Object.keys(this._byCharacter)

    if (recipe.type === `enclosure`) {
      const enclosureRecipe = recipe as Enclosure.EnclosureRecipe

      if (!this._byOpener[enclosureRecipe.opener]) this._byOpener[enclosureRecipe.opener] = []
      if (!this._byOpener[enclosureRecipe.opener].includes(recipe.name)) this._byOpener[enclosureRecipe.opener].push(recipe.name)

      if (!this._byCloser[enclosureRecipe.closer]) this._byCloser[enclosureRecipe.closer] = []
      if (!this._byCloser[enclosureRecipe.closer].includes(recipe.name)) this._byCloser[enclosureRecipe.closer].push(recipe.name)
    } else if (recipe.type === `separator`) {
      const separatorRecipe = recipe as Separator.SeparatorRecipe
    } else if (recipe.type === `primitive`) {
      const primitiveRecipe = recipe as Primitive.PrimitiveRecipe
    } else if (recipe.type === `aggregator`) {
      const aggregatorRecipe = recipe as Aggregator.AggregatorRecipe
    } else if (recipe.type === `pattern`) {
      const patternRecipe = recipe as Pattern.PatternRecipe
    } else {
      debugger

      throw new Error(`Implemented managing for recipe type: ${recipe.type}`)
    }

    return true
  }
}
