import { cloneDeep, isEmpty, isNil, isString, max, min, range } from "lodash"
import chalk from "chalk"

import { isNilOrEmpty } from "@december/utils"

import type Tree from "../tree"

import { numberToLetters } from "../utils"
import { RecipeName } from "../recipe"

import NodePrinter, { NodePrinterOptions } from "./printer3"
import NodeParser from "./parser"
import NodeValidator from "./validator"
import { KeyedRecipe, Recipe } from "../recipe/recipe"

import churchill, { paint } from "../logger"
import { override } from "prompts"
import { Cell } from "./cell"
export const logger = churchill.child(`node`)

export type NodeMeta = {
  syntax: string
}

export interface UnbalancedNode {
  index: number
  syntax: string
}

export type SerializedNode<TData extends object = any> = {
  parent: string | null
  id: number | `root`

  meta: NodeMeta
  start: number
  length: number

  relevant: ([number, number] | number)[]

  children: SerializedNode[]
  unbalanced: UnbalancedNode[]

  data: TData
}

/**
 * IDs for Nodes are EXCLUSEVELY numeric, except for the root node, which is always `root`.
 * The IDs also denote the order in which the child nodes are presented inside a parent node.
 */
export default class Node {
  __node = true
  tree!: Tree

  // composing the bulk of the code
  printer: NodePrinter
  parser: NodeParser
  validator: NodeValidator

  // #region Parent
  __parent: Node | null = null
  get parent(): Node | null {
    return this.__parent
  }
  set parent(value: Node | null) {
    if (value) {
      if (isNil(value.tree)) debugger
      this.tree = value.tree
    }

    this.__parent = value
  }
  // #endregion

  id: `root` | number

  meta: NodeMeta
  start: number
  length: number = Infinity

  relevant: ([number, number] | number)[] // flag syntax relevant indexes/range of indexes inside node

  children: Node[] = []
  unbalanced: UnbalancedNode[] = []

  /**
   * Create a new node.
   * It is usually created as a root, without parent or tree. Those should be added EXPLICITLY!!
   */
  constructor(id: number | `root`, start: number, meta: NodeMeta) {
    this.printer = new NodePrinter(this)
    this.parser = new NodeParser(this)
    this.validator = new NodeValidator(this)

    this.id = id

    this.meta = meta
    this.start = start
    this.length = Infinity

    this.relevant = []

    this.children = []
    this.unbalanced = []
  }

  isRoot() {
    return this.id === `root`
  }

  // #region Getters

  get end() {
    if (this.length === Infinity) return null
    return this.start + this.length - 1
  }

  // Returns end of node OR end of tree, when node is unbalanced
  get safe_end() {
    return this.end ?? this.tree.text.length - 1
  }

  get substring() {
    return this.tree.text.substring(this.start, this.safe_end + 1)
  }

  get root() {
    return this.tree.root
  }

  //    #region Recipe/Syntax

  get recipe() {
    const recipe = this.tree.recipes.get(this.meta.syntax as any)

    // ERROR: Cannot be
    if (!recipe) debugger

    return recipe
  }

  get syntax() {
    return this.recipe
  }

  get prefix() {
    return this.recipe.prefix
  }

  //    #endregion

  //    #region Identification

  get level() {
    const parentLevel = (this.parent?.level ?? -1) as number
    return parentLevel + 1
  }

  get context() {
    if (this.id === `root`) return `root`
    return `${this.prefix}${this.level}${this.isRoot() ? `` : `.` + numberToLetters(this.id)}`
  }

  get path(): string {
    if (!this.parent) return ``
    const parentPath = this.parent.path
    if (isEmpty(parentPath)) return this.parent.id.toString()
    return `${parentPath}/${this.parent.id}`
  }

  get fullpath() {
    const path = this.path
    return `${path}${path === `` ? `root/` : `/`}${this.id}`
    // return `${path}${path === `` ? `` : `/`}${this.id}`
  }

  //    #endregion

  //    #region Flags

  get isUnbalanced() {
    return this.end === null
  }

  get isMathTree(): boolean {
    // TODO: Implement math syntaxes
    if (this.meta.syntax === `math_expression`) return true
    if (this.parent) return this.parent.isMathTree

    return false
  }

  get isMathAllowed(): boolean {
    // TODO: Implement math syntaxes
    return false
    // return this.isMathTree && !this.hasAncestor(`quotes`)
  }

  //    #endregion

  //    #region Aesthetics

  get color() {
    if (this.id === `root`) return paint.white

    const rest = this.id % 3
    if (rest === 2) return paint.magenta
    if (rest === 1) return paint.green
    else return paint.cyan
  }

  get backgroundColor() {
    if (this.id === `root`) return paint.bgWhite

    const rest = this.id % 3
    if (rest === 2) return paint.bgMagenta
    if (rest === 1) return paint.bgGreen
    else return paint.bgCyan
  }
  //    #endregion

  // #endregion

  // #region Syntax

  isSyntax(syntax: RecipeName | RegExp) {
    if (isString(syntax)) return this.meta.syntax === syntax
    else return !!this.meta.syntax.match(syntax)
  }

  isKeyedSyntax() {
    const recipe = this.recipe as any
    return recipe.keys !== undefined
  }

  /** Returns a child node by "key", which ONLY exists if the parent node (this) is a keyed node (at first, only aggregators, and not always them) */
  key(key: string) {
    if (!this.isKeyedSyntax()) return undefined

    const keyedRecipe = this.recipe as any as KeyedRecipe
    return keyedRecipe.key(key, this)
  }

  // #endregion

  // #region Parentage

  _addChild(child: Node) {
    const thereIsAlreadyAChildWithThatID = this.children.find(node => node.id === child.id)

    if (thereIsAlreadyAChildWithThatID) {
      if (this.tree.options.strictChildId) throw new Error(`Node ${child.context} (${child.substring}) already exists as child of ${this.context}`)
      else {
        // if child id is not strict, just replace id with the next free one
        child.id = this.children.length
      }
    }

    this.children.push(child)

    child.parent = this
  }

  _removeChild(child: Node) {
    this.children = this.children.filter(node => node.id !== child.id)

    child.parent = null
  }

  addChild(...children: Node[]) {
    for (const child of children) this._addChild(child)
  }

  removeChild(...children: Node[]) {
    for (const child of children) this._removeChild(child)
  }

  /**
   * Returns node at specific index of tree.text (not the child node at that index of this.children)
   */
  at(index: number): Node | undefined {
    // return node level by index of character
    if (index < this.start) return undefined
    if (index > this.safe_end) return undefined

    const characterAtIndex = this.tree.text[index]

    for (const child of this.children) {
      const start = child.start
      const end = child.safe_end

      if (index >= start && index <= end) return child.at(index)
    }

    return this
  }

  hasAncestor(...syntaxes: (RecipeName | RegExp)[]): boolean {
    if (this.parent === null) return false

    if (syntaxes.some(syntax => this.parent.isSyntax(syntax))) return true
    return this.parent.hasAncestor(...syntaxes)
  }

  getLevels() {
    const list = [[this]] as Node[][]

    let newLeaves
    do {
      const leaves = list[list.length - 1]

      newLeaves = []
      for (const node of leaves) newLeaves.push(...node.children)

      list.push(newLeaves)
      // debugger
    } while (newLeaves.length > 0)

    list.pop()

    return list
  }

  //    #region Traversal
  pre_order(callback: (node: Node) => void) {
    callback(this)

    for (const child of this.children) {
      child.pre_order(callback)
    }

    /**
      "ORIGINAL GET" EXAMPLE

      if (context === this.context) return this

      for (const child of this.children) {
        const fromChildTree = child.get(context)
        if (fromChildTree) return fromChildTree
      }

      return undefined
     */
  }

  get(context: string): Node | undefined {
    let node: undefined | Node = undefined

    this.pre_order(_node => {
      if (_node.context === context) node = node || _node
    })

    return node
  }

  find(syntax: RecipeName | RegExp): Node | undefined {
    let node: undefined | Node = undefined

    this.pre_order(_node => {
      if (_node.isSyntax(syntax)) node = node || _node
    })

    return node
  }

  getOffspring() {
    const offspring = [] as Node[]

    this.pre_order(node => {
      offspring.push(node)
    })

    return offspring

    /**
     * ORIGINAL GET OFFSPRING EXAMPLE
     * 
        const offspring = [...this.children]

        for (const child of this.children) {
          offspring.push(...child.getOffspring())
        }

        return offspring
     */
  }

  getLeaves() {
    const leaves = [] as Node[]

    for (const child of this.children) {
      if (child.children.length === 0) leaves.push(child)
      else leaves.push(...child.getLeaves())
    }

    this.pre_order(node => {
      if (node.children.length === 0) leaves.push(node)
    })

    return leaves

    /*
      ORIGINAL GET LEAVES EXAMPLE
      const leaves = [] as Node[]

      for (const child of this.children) {
        if (child.children.length === 0) leaves.push(child)
        else leaves.push(...child.getLeaves())
      }

      return leaves
    */
  }

  //    #endregion

  // #endregion

  // #region Serialization

  serialize<TData extends object = any>() {
    const object: SerializedNode<TData> = {
      parent: this.parent?.fullpath ?? null,
      id: this.id,

      meta: this.meta,
      start: this.start,
      length: this.length,

      relevant: cloneDeep(this.relevant),

      children: this.children.map(node => node.serialize()),
      unbalanced: this.unbalanced,

      data: {} as TData,
    }

    // object.data = this.data as TData

    return object
  }

  static deserialize(tree: Tree, serialized: SerializedNode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data = serialized.data as any

    // TODO: Deserialize math objects
    // if (data.mathObject) data.mathObject = MathObject.deserialize(data.mathObject)

    const node = new Node(serialized.id, serialized.start, serialized.meta)
    node.length = serialized.length
    node.relevant = cloneDeep(serialized.relevant)

    node.unbalanced = serialized.unbalanced

    for (const serializedChild of serialized.children) {
      if (node.fullpath !== serializedChild.parent) {
        // ERROR: Node doesnt seem to be parent of child
        // eslint-disable-next-line no-debugger
        debugger
      }

      const child = Node.deserialize(tree, serializedChild)
      node.addChild(child)
    }

    return node
  }

  // #endregion

  // #region Utils

  _new(start: number, syntax: Recipe, id?: number | `root`) {
    // id will be its probable (not necessaryly) index inside children
    id = id === undefined ? this.children.length : id

    const node = new Node(id, start, { syntax: syntax.name })
    // const node = new Node(this.parser, null, id, start, syntax) // new node starts at enclosure opener
    this.addChild(node)

    return node
  }

  _newAt(start: number, syntax: Recipe, at: number, id?: number | `root`) {
    // q gambiarra hein queridao

    const node = this._new(start, syntax, id)

    // remove newly created child from list of children
    this.children.splice(this.children.length - 1, 1)

    // alocate in correct position as children
    this.children.splice(at, 0, node)

    return node
  }

  // #endregion

  print(options: Partial<NodePrinterOptions> = {}) {
    return this.printer.print(options)
  }

  parse() {
    return this.parser.parse()
  }

  validate() {
    return this.validator.validate()
  }

  /** Universal call to "close" a node (usually set length and some extra data, like relevant) */
  close(length: number, relevant?: ([number, number] | number)[]) {
    this.length = length

    this.relevant = this.syntax.getRelevant(this, relevant)

    return true
  }

  /**
   * Reset node's start and end, based on starts/ends of its children and relevants (if any)
   */
  rasterize(minStart: number, maxEnd: number) {
    const middles = (this.relevant ?? []).flat(Infinity) as number[]

    this.start = min([...this.children.map(node => node.start), ...middles])!
    let end = max([...this.children.map(node => node.end), ...middles])!

    if (minStart !== undefined) this.start = Math.min(this.start, minStart)
    if (maxEnd !== undefined) end = Math.max(this.end!, maxEnd)

    this.length = end - this.start + 1
  }

  toString() {
    const source = this.tree.text
    let string = ``

    // index children by their start
    const children = this.children.reduce((acc, child) => {
      acc[child.start] = child
      return acc
    }, {}) as Record<number, Node>

    // traverse content
    let i = this.start
    while (i <= this.end!) {
      const node = children[i]

      if (node) {
        string += node.toString()
        i += node.length
      } else {
        string += source[i]
        i++
      }
    }

    if (this.syntax.name === `nil`) debugger
    if (this.syntax.name === `comma`) string = `⌀${string}`

    return string
  }

  toCell(): Cell {
    const cell = new Cell(this.toString(), this.start, this.end!)

    return cell
  }

  toCells() {
    const source = this.tree.text
    const cells = [] as Cell[]

    // index children by their start
    const children = this.children.reduce((acc, child) => {
      acc[child.start] = child
      return acc
    }, {}) as Record<number, Node>

    // traverse content
    let i = this.start
    let carrier = Cell.empty()
    while (i <= this.end!) {
      const node = children[i]

      if (node) {
        // save carrier
        if (carrier.content.length > 0) cells.push(carrier)

        // save node as cell
        const cell = node.toCell()
        cells.push(cell)

        i += node.length // jump to next char after node

        carrier = Cell.empty(i) // reset carrier
      } else {
        // advance carrier
        carrier.content += source[i]
        carrier.end++

        i++ // next char
      }
    }

    if (carrier.content.length > 0) cells.push(carrier)

    return cells
  }

  // p1arse(escape: (RecipeName | `string` | `*`)[] = []) {
  //   if (isNilOrEmpty(this.start) || this.start === -1 || this.start === Infinity) throw new Error(`Invalid node start: ${this.start}`)

  //   // list all recipes that, when found, will be ignored ("escaped")
  //   const ESCAPING_ENCLOSURE = [...new Set([...(escape ?? []), ...(this.recipe.escape ?? [])])]

  //   const log = logger.builder().tab()

  //   log.add(`${chalk.italic.gray(`[${chalk.bold(`node`)}/${this.id}]`)} parsing (${this.recipe.prefix}, ${ESCAPING_ENCLOSURE.join(`,`)})`).verbose()
  //   log.tab()

  //   // get substring from start (souce is tree.text ALWAYS, since it is immutable)
  //   let substring = this.substring
  //   let start = this.start

  //   // advance one to account for enclosure opener
  //   if (this.recipe.type === `enclosure`) {
  //     substring = substring.substring(1)
  //     start++
  //   }

  //   const children = [] as Node[] // temporary holder for children
  //   let stringNode = null // reference for a general purpose string node (will receive string/not special characters from substring)
  //   // for each character in substring
  //   for (let i = 0; i < substring.length; i++) {
  //     this.parseAt(i, start, substring)

  //     const prevChar = substring[i - 1]
  //     const nextChar = substring[i + 1]
  //     const char = substring[i]
  //     const index = start + i // index of character in tree.text

  //     // #region Exceptions

  //     // if it is not a special character
  //     const notSpecialCharacter = !this.tree.characterSet.includes(char)

  //     // if node enclosure escapes something
  //     //    AND which it escapes is ANY (*) or corresponding TYPE OF CURRENT CHAR (i.e. char is within a set of a recipe that is included in the list of escapades)
  //     //    AND current char IS NOT CLOSER for node enclosure
  //     const escapedCharacter = ESCAPING_ENCLOSURE.length > 0 && (ESCAPING_ENCLOSURE.includes(`*`) || ESCAPING_ENCLOSURE.includes(this.meta.type)) && char !== this.recipe.closer

  //     // special case for "subtraction" (minus sign)
  //     //    AND previous char is not a digit or space
  //     //    AND next char is not a digit or space
  //     const escapeMinus = this.meta.type === `subtraction` && !!prevChar?.match(/[^\s\d]/) && !!nextChar?.match(/[^\s\d]/)

  //     // nothing to parse here, build string node and move on
  //     if (notSpecialCharacter || escapedCharacter || escapeMinus) {
  //       if (stringNode === null) {
  //         stringNode = new Node(this, children.length, index, { type: `string` })
  //         log.add(`${chalk.italic.gray(`[${chalk.bold(`node`)}/${stringNode.context}]`)} creating`).silly()
  //       }
  //       stringNode.end = index // expect current char to be the last of string node (could be wrong, but will be corrected later in loop)

  //       log.add(`${chalk.italic.gray(`[char/${i}]`)} ${char} | appended to node ${stringNode.context}`).silly()

  //       continue
  //     }

  //     // #endregion

  //     // if string node found an end last loop, add current string node to children and kill it
  //     if (!isNil(stringNode?.end)) {
  //       children.push(stringNode)
  //       stringNode = null
  //     }

  //     // get recipe for character (only parsable characters have recipes)
  //     const recipe = RECIPE_BY_CHARACTER[character]
  //   }
  // }

  // pa1rseAt(i: number, start: number, substring: string) {
  //   const prevChar = substring[i - 1]
  //   const nextChar = substring[i + 1]
  //   const char = substring[i]
  //   const index = start + i // index of character in tree.text

  //   // if it is not a special character
  //   const notSpecialCharacter = !this.tree.characterSet.includes(char)
  // }
}
