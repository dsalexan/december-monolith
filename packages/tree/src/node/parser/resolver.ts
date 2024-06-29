import { isNil, last } from "lodash"
import type NodeParser from "."
import type Node from ".."
import { NodeParserOptions, NodeParserSetup, defaultOptions } from "./options"
import { Recipe, RecipeRestriction } from "../../recipe/recipe"
import { EnclosureRecipe } from "../../recipe/enclosure"
import { SeparatorRecipe } from "../../recipe/separator"
import { AggregatorRecipe } from "../../recipe/aggregator"

// const RESOLVE_DIRECTIVES = [`close`, `open`, `char_child`, `unbalanced`, `as_string`] as const
// type ResolveDirective = (typeof RESOLVE_DIRECTIVES)[number]

const STRING_RESOLVE_DIRECTIVES = [`string`] as const
const SYNTAX_RESOLVE_DIRECTIVES = [
  `unbalanced`, // closer character in the wild, mark as unbalanced but consider it string
  `open_new`, // create a new node for the syntax
  `close_current`, // close current node
  `open_and_close_at_char`, // create a new node only for the character (close it immediately)
] as const
const RESOLVE_DIRECTIVES = [`unknown`, ...SYNTAX_RESOLVE_DIRECTIVES, ...STRING_RESOLVE_DIRECTIVES] as const

type StringResolveDirective = (typeof STRING_RESOLVE_DIRECTIVES)[number]
type SyntaxResolveDirective = (typeof SYNTAX_RESOLVE_DIRECTIVES)[number]
type ResolveDirective = (typeof RESOLVE_DIRECTIVES)[number]

export default class NodeParserResolver {
  parser: NodeParser

  get node() {
    return this.parser.node
  }

  get options() {
    return this.parser.options
  }

  get setup() {
    return this.parser.setup
  }

  constructor(parser: NodeParser) {
    this.parser = parser
  }

  // #region Utils

  _carry(start: number) {
    const children = this.node.children

    // first check if last child could be a carry string node
    const lastChild = last(children)!

    const isString = lastChild?.syntax.name === `string`
    const endsImmediatelyBefore = lastChild?.end === start - 1

    let node: Node
    if (isString && endsImmediatelyBefore) {
      //    if last child is a string AND ends immediately before this index

      // set it as carry string node
      node = children.pop()!
      this.node.addChild(node)
    } else {
      // if not, create a new carry string node
      node = this.node._new(start, this.node.tree.recipes.get(`string`))
    }

    return node
  }

  /** Resolve a node using this options */
  _resolve(node: Node) {
    node.parser._defaultOptions(this.options)
    node.parser.resolver.resolve()
  }

  // #endregion

  canResolve() {
    // const SETUP = this._setup(options, true)

    const hasStart = !isNil(this.node.start) && this.node.start !== -1 && this.node.start !== Infinity

    if (!hasStart) throw new Error(`Invalid node start: ${this.node.start}`)

    return true
  }

  resolve(): boolean {
    if (!this.canResolve()) return false

    const { logger } = this.setup

    if (logger) logger.add(`resolve`).verbose()

    // get substring from start (source is tree.text ALWAYS, since it is immutable)
    let substring = this.node.substring
    let start = this.node.start

    // advance one to account for enclosure opener (no need to parse the opener, since we already know the node is an enclosure)
    let i0 = 0
    if (this.node.syntax.type === `enclosure`) i0++

    // main loop
    let carryStringNode = null as Node | null // carry string node found
    for (let i = i0; i < substring.length; i++) {
      const index = start + i // index of character in tree.text (i.e. global index)
      const char = substring[i] // character in tree.text (i.e. character, character at index)

      // check if character is relevant to some syntatic recipe
      const recipes = this._recipesByCharacter(index)

      // decide HOW to parse character
      let { directive, syntax } = this._decide(index, recipes)

      // effective parse, mostly just advancing index on string

      //    0. close carry in case we create a new child (if necessary we can "recover" it later with _carry)
      carryStringNode = null

      //    1. trying to create new nodes
      if (directive === `open_new`) {
        const node = this.node._new(index, syntax)
        this._resolve(node)

        // if node is NOT unbalanced
        if (!node.isUnbalanced) i += node.end! - index // node is OK, advance cursor to its end to continue parsing
        else {
          // remove node from children
          this.node.removeChild(node)

          // inform character at index is unbalanced
          directive = `unbalanced`
        }
      } else if (directive === `open_and_close_at_char`) {
        // consider current character as a separate node on its on (child to current node)
        const node = this.node._new(index, syntax)
        node.close(index - node.start + 1)
      }

      //    2. trying to close nodes (current one or discarding unbalanced)
      if (directive === `close_current`) {
        // close node and bail loop, no need to check further characters for this node specifically
        this.node.close(index - this.node.start + 1)
        break
      } else if (directive === `unbalanced`) {
        // register unbalanced character inside node (and which syntax it was supposed to be)
        this.node.unbalanced.push({ index, syntax: syntax.name })

        // since it is not truly a relevant character, consider it a string
        directive = `string`
      }

      //    3. parse as a string if necessary
      if (directive === `string`) {
        // recover carry (create one if necessary)
        carryStringNode = this._carry(index)

        // advance carry one character
        this._advance(carryStringNode, index)
      } else if (directive === `unknown`) {
        // ERROR: Can NEVER parse as unknown
        debugger
      }
    }

    // explicitally set length of root node as same as tree text length
    if (this.node.isRoot() && this.node.length === Infinity) this.node.length = this.node.tree.text.length - 1

    // validation, tree must remain, well, valid
    const validation = this.node.validate()
    if (!validation.success && this.node.validator.tree()) debugger

    return true
  }

  _recipesByCharacter(index: number): Recipe[] {
    const char = this.node.tree.text[index]

    // get all recipes relevant for character
    const recipes = this.node.tree.recipes.byCharacter(char)

    // remove those not allowed
    const allowedRecipes = [] as Recipe[]
    const refusedRecipes = {} as Record<RecipeRestriction, Recipe[]>
    for (const recipe of recipes) {
      let invalidRestrictions = [] as RecipeRestriction[]

      if (!recipe.validateRestriction(`parents`, [recipe])) invalidRestrictions.push(`parents`)
      if (!recipe.validateRestriction(`grandparents`, [recipe])) invalidRestrictions.push(`grandparents`)

      if (invalidRestrictions.length === 0) allowedRecipes.push(recipe)
      else {
        for (const restriction of invalidRestrictions) {
          if (!refusedRecipes[restriction]) refusedRecipes[restriction] = []
          refusedRecipes[restriction].push(recipe)
        }
      }
    }

    // WARN: Untested when some recipe is refused
    if (Object.keys(refusedRecipes).length > 0) debugger

    return allowedRecipes
  }

  /** Advance node (length++) */
  _advance(node: Node, to?: number) {
    // ERROR: Cannot advance backwards dude
    if (to! < node.start) debugger

    if (to === undefined) to = (node.end ?? node.start) + 1

    node.length = to - node.start + 1

    // TODO: Implement specialized advance
  }

  // #region Decide

  _decide(index: number, recipes: Recipe[]): { directive: ResolveDirective; syntax: Recipe } {
    // if there is no recipes for index, then it is a string
    if (recipes.length === 0) return { directive: `string`, syntax: this.node.tree.recipes.get(`string`) }

    // ERROR: Unimplemented
    if (recipes.length > 1) debugger

    const char = this.node.tree.text[index]
    const syntax = recipes[0]

    let directive: ResolveDirective = `unknown`

    // decide directive based on syntax
    if (syntax.type === `enclosure`) directive = this._enclosure(index, syntax as EnclosureRecipe)
    else if (syntax.type === `separator` || syntax.type === `aggregator`) directive = this._xator(index, syntax as SeparatorRecipe | AggregatorRecipe)
    else {
      // ERROR: Syntax not Implemented
      debugger
    }

    return { directive, syntax }
  }

  _enclosure(index: number, enclosureSyntax: EnclosureRecipe): ResolveDirective {
    const char = this.node.tree.text[index]

    const itClosesThisNode = char === (this.node.syntax as EnclosureRecipe).closer
    const isOpener = char === enclosureSyntax.opener
    const isCloser = char === enclosureSyntax.closer

    // check if it is the closer expected for this node
    //    if it is, then end of node found, break from loop
    if (itClosesThisNode) return `close_current`

    // character is an opener for an enclosure
    //    so create a new node for the enclosure
    if (isOpener) return `open_new`

    // found an closer character in the wild
    //    since it is not a closer for this node, it is UNBALANCED
    if (isCloser) return `unbalanced`

    // ERROR: Enclosure behaviour not implemented
    debugger

    return `unknown`
  }

  _xator(index: number, syntax: SeparatorRecipe | AggregatorRecipe): ResolveDirective {
    const char = this.node.tree.text[index]

    const separatorSyntax = syntax as SeparatorRecipe
    const aggregatorSyntax = syntax as AggregatorRecipe

    // currently there is nothing to check against here
    // any relevant decision about a Xator syntax is mostly parent/grandparent stuff, and this is automatic inside the recipe list decision for every character
    //     (that when a syntax ACTUALLY has parentage restrictions)
    return `open_and_close_at_char`
  }

  // #endregion
}
