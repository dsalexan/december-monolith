import { range, flatten, sortBy, isEqual, first, isString, flattenDeep, before, isNil, orderBy, isArray } from "lodash"
import { Node } from "./node"
import { RECIPES, RECIPES_BY_TYPE, Recipe, RecipeName, RecipeType, getRecipeSet } from "./recipe"

import churchill from "../logger"

export const logger = churchill.child(`tree`)

export class Tree {
  text: string
  root: Node

  recipes: Recipe[]
  characterSet: string[]

  constructor(text: string, types: (RecipeType | { type: RecipeType; names: RecipeName[] })[] = [{ type: `enclosure`, names: [`parenthesis`, `braces`, `brackets`, `quotes`] }]) {
    this.text = text
    this.root = new Node(null, `root`, 0, { type: `string` })
    this.root.tree = this

    this.recipes = types
      .map(type => {
        if (isString(type)) return RECIPES_BY_TYPE[type].map(name => RECIPES[name])
        return type.names.map(name => RECIPES[name])
      })
      .flat()
    this.characterSet = this.recipes.map(recipe => getRecipeSet(recipe)).flat()
  }

  toString() {
    return `<#${this.root.context}>`
  }

  parse() {
    logger.builder().add(`Parsing Tree`).debug()
    logger.builder().add(this.text).verbose()

    this.root.parse()
  }

  print() {
    logger.builder().add(`<TREE> ${this.text}\n`).debug()
    this.root.print()
  }
}
