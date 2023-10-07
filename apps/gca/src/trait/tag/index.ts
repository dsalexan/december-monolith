/* eslint-disable no-debugger */
import { intersection, uniq } from "lodash"
import { SyntaxName } from "../parser/syntax"
import { isNumeric } from "mathjs"
import chalk from "chalk"
import Trait from ".."
import { guessNodeType, hasOnlybornAnd, isOnlyborn, removeWrapper, trimAndUnwrap } from "../parser/node/utils"
import { TraitTagValue, UNPARSED_VALUE } from "./value"
import { TAGS, TAG_NAMES, TAG_NAME_EQUIVALENCY, TagName } from "./tag"
import { TraitIssueWithoutPipeline, createTraitIssue } from "../issues"
import INode from "../parser/node/interface"

export default class TraitTag {
  trait: Trait

  listNode: INode
  nameNode: INode
  valueNode: INode

  _name!: string
  name!: TagName
  _value!: TraitTagValue

  constructor(trait: Trait, node: INode) {
    this.trait = trait

    // ERROR: Node is not a tag
    if (!TraitTag.isNodeATag(node, trait)) debugger

    this.listNode = node
    const nameNode = TraitTag.getNameNode(node)
    const valueNode = TraitTag.getValueNode(node)

    // ERROR: Name node MUST be a string
    if (nameNode.syntax.name !== `string`) debugger

    // ERROR: Value node MUST be a parenthesis
    if (valueNode.syntax.name !== `parenthesis`) debugger

    this.nameNode = nameNode
    this.valueNode = valueNode

    this._value = new TraitTagValue(this)
  }

  get values() {
    return this._value.get()
  }

  get isValueParsed() {
    return this.values !== UNPARSED_VALUE
  }

  // #region Static helpers

  // determine if a node is in the format expected of a tag
  static isNodeATag(node: INode, trait?: Trait) {
    // ERROR: Cannot convert node other than list to traittag
    if (node.syntax.name !== `list`) {
      debugger
      return false
    }

    // ERROR: Lists need to have exactly 2 children (name, value)
    if (node.children.length !== 2) {
      // ERROR: Line is most likely corrupted

      // just for debugging purposes
      const fst = trait?._row?.fst
      const fstndx = trait?._row?.fstndx

      console.error(node.backgroundColor(`${` `.repeat(50)}row "${chalk.bold(fst)}"${` `.repeat(50)}`))
      node.printer.relevant({ sections: [`header`, `context`] })

      debugger

      return false
    }

    return true
  }

  static getNameNode(node: INode) {
    return node.children[0]
  }

  static getValueNode(node: INode) {
    return node.children[1]
  }

  // #endregion

  parse(): TraitIssueWithoutPipeline[] {
    const parseNameIssues = this.parseName()
    const parseValueIssues = this.parseValue(parseNameIssues.length > 0)

    return [...parseNameIssues, ...parseValueIssues]
  }

  parseName(): TraitIssueWithoutPipeline[] {
    const name = this.nameNode.substring.trim()

    const trueName = TAG_NAME_EQUIVALENCY[name] ?? (name as TagName)

    this._name = name
    this.name = trueName

    if (!TAG_NAMES.includes(this.name))
      return [
        createTraitIssue(`missing_tag_name`, {
          trait: this.trait,
          tag: this,
          node: this.nameNode,
          //
          key: this.name,
        }),
      ]

    return []
  }

  parseValue(isMissingTagName: boolean): TraitIssueWithoutPipeline[] {
    // parsing of value dependes HEAVILY on the tag name
    this._value.setup()

    // no need to try to parse value if name is missing, just consider it a string (i.e. run _value.setup())
    if (isMissingTagName) return []

    // if tag name is not missing, lets check first if definition is complete
    const definition = TAGS[this.name]

    // ERROR: There should be a definition, since tag name is not given missing (probably TAG_NAMES and TAGS are not up to date with each other, go to worksheet and re-export the data)
    if (!definition) debugger

    const isUnknownType = definition.type === `unknown`

    if (isUnknownType)
      return [
        createTraitIssue(`incomplete_tag_definition`, {
          trait: this.trait,
          tag: this,
          node: this.valueNode,
          //
          key: this.name,
          types: this.valueNode.children.map(child => guessNodeType(child)),
        }),
      ]

    /**
     * Every tag can be piped. At first.
     * At mounting the trait i'm gonna run some validations to see if the pipings are correct.
     *
     * Some tags can have a unreleated ammount of pipes (in regards to other tags)
     * Most tags should have the same number of pipes. The pipes inform what GCA call "modes"
     */

    const parseValueIssues = this._value.parse()

    if (!this._value.isParsed) {
      // inform that tag value was not parsed (usually ignored, but can probably be usefull at the very end of this "gca parsing" sub project)
      parseValueIssues.push(
        createTraitIssue(`tag_not_parsed`, {
          trait: this.trait,
          tag: this,
          node: this.valueNode,
          //
          key: this.name,
          types: this.valueNode.children.map(child => guessNodeType(child)),
        }),
      )
    } else if (!this._value.isFullyParsed) {
      // inform that tag value was not parsed FULLY (usually ignored, but can probably be usefull at the very end of this "gca parsing" sub project)
      parseValueIssues.push(
        createTraitIssue(`tag_not_parsed`, {
          trait: this.trait,
          tag: this,
          node: this.valueNode,
          //
          key: this.name,
          types: this.valueNode.children.map(child => guessNodeType(child)),
          partial: true,
        }),
      )
    }

    return [...parseValueIssues]
  }
}
