import { isNil, isString, range } from "lodash"
import { Tree } from "."

import { RECIPES, RECIPE_BY_CHARACTER, RecipeName } from "./recipe"

import churchill from "../logger"
import { isNilOrEmpty } from "@december/utils"
import chalk from "chalk"

const ALPHABET = [`a`, `b`, `c`, `d`, `e`, `f`, `g`, `h`, `i`, `j`, `k`, `l`, `m`, `n`, `o`, `p`, `q`, `r`, `s`, `t`, `u`, `v`, `w`, `x`, `y`, `z`]

function toName(j: number) {
  let i = j % ALPHABET.length
  const f = Math.floor(j / ALPHABET.length)

  return `${range(0, f)
    .map(() => ALPHABET[0])
    .join(``)}${ALPHABET[i]}`
}

export type NodeMeta = {
  type: `string` | RecipeName
}

export const logger = churchill.child({ name: `node` })

export class Node {
  tree!: Tree

  __parent: Node | null = null
  get parent() {
    return this.__parent
  }
  set parent(value: Node | null) {
    if (value) {
      if (isNil(value.tree)) debugger
      this.tree = value.tree
    }
    this.__parent = value
  }

  id: `root` | number
  start: number
  end: number | null
  meta: NodeMeta

  children: Node[] = []
  unbalanced: unknown[] = []

  constructor(parent: Node | null, id: number | `root`, start: number, meta: NodeMeta) {
    this.parent = parent

    this.id = id

    this.start = start
    this.end = null

    this.meta = meta

    this.children = []
    this.unbalanced = []
  }

  get recipe() {
    return this.meta.type === `string` ? { type: `string`, prefix: `x`, escape: [], closer: null } : RECIPES[this.meta.type]
  }

  get prefix() {
    return this.recipe.prefix
  }

  get level() {
    const parentLevel = (this.parent?.level ?? -1) as number
    return parentLevel + 1
  }

  get context() {
    if (this.id === `root`) return `root`
    return `${this.prefix}${this.level}${this.id === `root` ? `` : `.` + toName(this.id)}`
  }

  // Returns end of node OR end of tree, when node is unbalanced
  get safe_end() {
    return this.end ?? this.tree.text.length
  }

  get substring() {
    return this.tree.text.substring(this.start, this.safe_end + 1)
  }

  // #region Parentage

  addChild(child: Node) {
    if (this.children.find(node => node.id === child.id)) throw new Error(`Node ${child.id} already exists as child of ${this.id}`)
    this.children.push(child)

    child.parent = this
  }

  removeChild(child: Node) {
    this.children = this.children.filter(node => node.id !== child.id)

    child.parent = null
  }

  // #endregion

  print() {
    logger.builder().tab()
    debugger
  }

  parse(escape: (RecipeName | `string` | `*`)[] = []) {
    if (isNilOrEmpty(this.start) || this.start === -1 || this.start === Infinity) throw new Error(`Invalid node start: ${this.start}`)

    // list all recipes that, when found, will be ignored ("escaped")
    const ESCAPING_ENCLOSURE = [...new Set([...(escape ?? []), ...(this.recipe.escape ?? [])])]

    const log = logger.builder().tab()

    log.add(`${chalk.italic.gray(`[${chalk.bold(`node`)}/${this.id}]`)} parsing (${this.recipe.prefix}, ${ESCAPING_ENCLOSURE.join(`,`)})`).verbose()
    log.tab()

    // get substring from start (souce is tree.text ALWAYS, since it is immutable)
    let substring = this.substring
    let start = this.start

    // advance one to account for enclosure opener
    if (this.recipe.type === `enclosure`) {
      substring = substring.substring(1)
      start++
    }

    const children = [] as Node[] // temporary holder for children
    let stringNode = null // reference for a general purpose string node (will receive string/not special characters from substring)
    // for each character in substring
    for (let i = 0; i < substring.length; i++) {
      this.parseAt(i, start, substring)

      const prevChar = substring[i - 1]
      const nextChar = substring[i + 1]
      const char = substring[i]
      const index = start + i // index of character in tree.text

      // #region Exceptions

      // if it is not a special character
      const notSpecialCharacter = !this.tree.characterSet.includes(char)

      // if node enclosure escapes something
      //    AND which it escapes is ANY (*) or corresponding TYPE OF CURRENT CHAR (i.e. char is within a set of a recipe that is included in the list of escapades)
      //    AND current char IS NOT CLOSER for node enclosure
      const escapedCharacter = ESCAPING_ENCLOSURE.length > 0 && (ESCAPING_ENCLOSURE.includes(`*`) || ESCAPING_ENCLOSURE.includes(this.meta.type)) && char !== this.recipe.closer

      // special case for "subtraction" (minus sign)
      //    AND previous char is not a digit or space
      //    AND next char is not a digit or space
      const escapeMinus = this.meta.type === `subtraction` && !!prevChar?.match(/[^\s\d]/) && !!nextChar?.match(/[^\s\d]/)

      // nothing to parse here, build string node and move on
      if (notSpecialCharacter || escapedCharacter || escapeMinus) {
        if (stringNode === null) {
          stringNode = new Node(this, children.length, index, { type: `string` })
          log.add(`${chalk.italic.gray(`[${chalk.bold(`node`)}/${stringNode.context}]`)} creating`).silly()
        }
        stringNode.end = index // expect current char to be the last of string node (could be wrong, but will be corrected later in loop)

        log.add(`${chalk.italic.gray(`[char/${i}]`)} ${char} | appended to node ${stringNode.context}`).silly()

        continue
      }

      // #endregion

      // if string node found an end last loop, add current string node to children and kill it
      if (!isNil(stringNode?.end)) {
        children.push(stringNode)
        stringNode = null
      }

      // get recipe for character (only parsable characters have recipes)
      const recipe = RECIPE_BY_CHARACTER[character]
    }
  }

  parseAt(i: number, start: number, substring: string) {
    const prevChar = substring[i - 1]
    const nextChar = substring[i + 1]
    const char = substring[i]
    const index = start + i // index of character in tree.text

    // if it is not a special character
    const notSpecialCharacter = !this.tree.characterSet.includes(char)
  }
}
