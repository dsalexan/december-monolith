import { isNilOrEmpty } from "@december/utils"
import { flatten, isNil } from "lodash"

export type RecipeType = `enclosure` | `math`

export type BaseRecipe = {
  prefix: string
  escape?: RecipeName[] // escape parsing when one of these recipes is found inside
}

export type EnclosureRecipe = BaseRecipe & {
  open: string
  close: string
  type: `enclosure`
}

export type MathRecipe = BaseRecipe & {
  middle: string
  type: `math`
  prio?: number
  identity?: number
}

export type Recipe = EnclosureRecipe | MathRecipe
export type RecipeName = `parenthesis` | `braces` | `brackets` | `quotes` | `percentage` | `subtraction` | `sum` | `division` | `product`

export const RECIPES = {
  parenthesis: {
    prefix: `ρ`,
    open: `(`,
    close: `)`,
    type: `enclosure`,
  },
  braces: {
    prefix: `γ`,
    open: `{`,
    close: `}`,
    type: `enclosure`,
  },
  brackets: {
    prefix: `β`,
    open: `[`,
    close: `]`,
    type: `enclosure`,
  },
  quotes: {
    prefix: `κ`,
    open: `"`,
    close: `"`,
    type: `enclosure`,
    escape: [`minus`, `plus`, `division`, `product`],
  },
  percentage: {
    prefix: `τ`,
    open: `%`,
    close: `%`,
    type: `enclosure`,
  },
  //
  subtraction: {
    prefix: `s`,
    middle: `-`,
    type: `math`,
  },
  sum: {
    prefix: `a`,
    middle: `+`,
    type: `math`,
  },
  division: {
    prefix: `d`,
    middle: `/`,
    type: `math`,
    prio: 1,
    identity: 1,
  },
  product: {
    prefix: `m`,
    middle: `*`,
    type: `math`,
    prio: 1,
    identity: 1,
  },
} as Record<RecipeName, Recipe>

export function getRecipeSet(recipe: Recipe) {
  return [recipe?.open, recipe?.close, recipe?.middle].filter(s => !isNilOrEmpty(s)) as string[]
}

export const RECIPE_BY_CHARACTER = Object.fromEntries(flatten(Object.entries(RECIPES).map(([key, recipe]) => getRecipeSet(recipe).map(char => [char, key]))))
export const RECIPES_BY_TYPE = {
  enclosure: [`parenthesis`, `braces`, `brackets`, `quotes`, `percentage`],
  math: [`plus`, `minus`, `division`, `product`],
} as Record<RecipeType, RecipeName[]>

export const OPENERS = Object.fromEntries(
  Object.entries(RECIPES)
    .map(([key, type]) => (type.opener ? [type.opener, key] : undefined))
    .filter(b => b !== undefined),
) as any as string[]

export const CLOSERS = Object.values(RECIPES)
  .map(character => character.closer)
  .filter(b => !isNil(b)) as any as string[]
