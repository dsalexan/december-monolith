/* eslint-disable no-debugger */
import { isNumeric } from "mathjs"
import { guessNodeType, hasOnlybornAnd, isOnlyborn, isOnlybornAnd, removeWrapper, trimAndUnwrap } from "../parser/node/utils"
import TraitTag from "."
import { TAGS } from "./tag"
import chalk from "chalk"
import { TagLazyComponent, TagLazyType, TagLazyValue, makeLazyComponent, makeLazyValue } from "./lazy"
import MathObject from "../parser/syntax/math/object"
import { TRAIT_PREFIX_TAGS } from "../sections"
import { isArray, isNil, isString, isSymbol, uniq } from "lodash"
import INode from "../parser/node/interface"
import { TraitIssue, createTraitIssue } from "../issues"
import { LOGIC_RECOGNIZED_FUNCTIONS } from "../parser/syntax/logic"

import churchil from "../../logger"
import { isNilOrEmpty } from "@december/utils"

export const TRAIT_TAG_VALUE_STATE = [`unparsed`, `parsed`] as const
export type TraitTagValueState = (typeof TRAIT_TAG_VALUE_STATE)[number]

export const UNPARSED_VALUE = Symbol.for(`UNPARSED_VALUE`)
export const LAZY_VALUE = Symbol.for(`LAZY_VALUE`)
export const MATH_VALUE = Symbol.for(`MATH_VALUE`)

type Unparsed<Type> = Type | typeof UNPARSED_VALUE

export type TraitTagParsedValue<TValue = unknown> = TValue | typeof LAZY_VALUE | typeof MATH_VALUE

type PossibleTraitTagValue<TValue = unknown> = TraitTagParsedValue<TValue>[] | typeof UNPARSED_VALUE

type ParsedValue<TValue = unknown> = TraitTagParsedValue<TValue> | typeof UNPARSED_VALUE

type Suffixed<Type, Suffix = string> = {
  value: Type
  suffix?: Suffix
}

const logger = churchil.child(`trait`)

export class TraitTagValue<TValue = unknown> {
  tag: TraitTag

  string!: string
  parsed!: PossibleTraitTagValue<TValue>
  lazy?: TagLazyValue

  issues: Omit<TraitIssue, `pipeline`>[] = [] // temporary holder for issues array while parsing

  constructor(tag: TraitTag) {
    this.tag = tag
  }

  get node() {
    return this.tag.valueNode
  }

  get name() {
    return this.tag.name
  }

  get definition() {
    return TAGS[this.name]
  }

  get math() {
    const mathObject = this.node.children[0].data.mathObject
    if (!mathObject) debugger

    return mathObject! as MathObject
  }

  get isParsed() {
    return this.parsed !== UNPARSED_VALUE
  }

  get isFullyParsed() {
    if (isArray(this.parsed)) return this.parsed.every(value => value !== UNPARSED_VALUE)
    return this.parsed !== UNPARSED_VALUE
  }

  get<TReturningValue = TValue>() {
    return this.parsed as any[] | typeof UNPARSED_VALUE
  }

  static setupNode(node: INode) {
    // remove parenthesis from node (everyone should have it)
    let string = removeWrapper(node.substring.trim())

    // if parenthesis onlyborn is a quotes, also remove quotes
    if (hasOnlybornAnd(node, [`quotes`])) {
      string = removeWrapper(node.children[0].substring.trim())
    }

    return string
  }

  setup() {
    // remove parenthesis from node (everyone should have it)
    this.string = removeWrapper(this.node.substring.trim())

    this.parsed = UNPARSED_VALUE

    // // if parenthesis onlyborn is a quotes, also remove quotes
    // if (hasOnlybornAnd(node, [`quotes`])) {
    //   string = removeWrapper(node.children[0].substring.trim())
    // }
  }

  unpipe() {
    const parenteshisChildren = this.node.children

    // by default, if value is not piped, pass value node
    let nodes = [this.node] // [node:parenthesis]

    // TODO: Maybe check if tag is mode enabled before unwrapping the pipes?

    // check if value's first child is onlyborn and pipe
    if (isOnlybornAnd(parenteshisChildren, [`pipe`])) {
      // value IS piped

      // parenteshisChildren[0] = pipe
      // pipe.children = list[]
      // list = "new" value node
      nodes = parenteshisChildren[0].children // [node:list, ..., node:list]

      if (nodes.length === 0) debugger // wtf
    } else {
      // value does not appear to be piped

      // there can be pipes not at first level
      //    gives(...) is an example of this, its value can be quite complex of a statement

      // check if there is a pipe in the first child level, but it is not onlyborn
      if (parenteshisChildren.length > 1 && parenteshisChildren.some(node => node.syntax.name === `pipe`)) {
        // ERROR: Untested
        debugger
      }
    }

    if (nodes.length === 0) debugger // wtf

    // this should return onde node for each instance/version/mode of a tag (tag value for a mode "of a trait" actually)
    return nodes
  }

  parse(): Omit<TraitIssue, `pipeline`>[] {
    const issues = [] as Omit<TraitIssue, `pipeline`>[]

    let parsedValues: PossibleTraitTagValue<TValue> = UNPARSED_VALUE

    const substring = this.node.substring

    this.issues = issues

    // if (this.name !== `basevalue`) return issues

    // unwrap pipe if necessary
    const nodes = this.unpipe()

    // for each individual node value, parse it
    for (const node of nodes) {
      let parsedValue: ParsedValue<TValue> = UNPARSED_VALUE

      const byLazy = this._lazy(parsedValue, node)
      const byMath = this._math(byLazy, node)
      const byDefinition = this._definition(byMath, node)

      // specific is a parsing based on tag name
      // const parsedByName = this.parseName(parsedByDefinition, node)

      if (parsedValues === UNPARSED_VALUE) parsedValues = []
      parsedValues.push(byDefinition)
    }

    // if NOTHING was parsed, reset
    if (parsedValues !== UNPARSED_VALUE && parsedValues.every(value => value === UNPARSED_VALUE)) parsedValues = UNPARSED_VALUE

    // update parsed value
    if (parsedValues !== UNPARSED_VALUE) {
      // ERROR: Jesus what a mess
      // if (parsedValues.some(value => value === UNPARSED_VALUE)) debugger

      // ERROR: wtf
      if (nodes.length !== (parsedValues as any).length) debugger

      this.parsed = parsedValues
    }

    return issues
  }

  _stringify(node: INode) {
    let _value = node.substring.trim()
    if (node.syntax.type === `enclosure`) _value = removeWrapper(_value)
    if (node.syntax.name === `nil` || isOnlybornAnd(node.children, [`nil`])) _value = ``

    return _value
  }

  _GCAToMathJSTransformer(originalString: string, node: INode) {
    let string = originalString

    // prefix tags
    const _prefix_tags = new RegExp(`(${TRAIT_PREFIX_TAGS.map(tag => tag).join(`|`)}):`, `g`)
    string = string.replaceAll(_prefix_tags, `$1_`)

    if (string !== originalString) debugger

    return string
  }

  // bellow there are the parsers. if a parser recieves a "carrier" (previousParsedValue) that is not UNPARSED, it just passes it along

  _lazy(previousParsedValue: ParsedValue<TValue>, node: INode) {
    if (previousParsedValue !== UNPARSED_VALUE) return previousParsedValue

    let _value = this._stringify(node)
    const hasPercentageEnclosure = _value.match(/(%[\w ]+%)/g)
    const hasBrackets = node.find(`brackets`)
    const hasDirectives = node.find(`directive`)

    const thereIsLazyToParse = !!hasPercentageEnclosure || !!hasBrackets || !!hasDirectives

    // if there are special characters, maybe this tag should be lazy enabled
    if (thereIsLazyToParse && this.definition.lazy === undefined)
      this.issues.push(
        createTraitIssue(`tag_could_be_lazy_enabled`, {
          trait: this.tag.trait,
          tag: this.tag,
          node: node,
          //
          key: this.name,
        }),
      )

    if (!this.definition.lazy) return UNPARSED_VALUE

    // even if it is lazy by definition, if there is nothing to parse here (a.k.a. non parced percentages), just keep going
    if (!thereIsLazyToParse) return UNPARSED_VALUE

    // WARN: This will cause node to be reparsed, MUTATING something that is not supposed to be mutated
    // reparse node targeting brackets and percentages

    // // double check if leaves have lazy special characters
    // const leaves = node.getLeaves()
    // const allLeavesHaveLazySpecialCharacters = leaves.every(leaf => leaf.substring.match(_lazy_special_characters))

    // if (!allLeavesHaveLazySpecialCharacters) return UNPARSED_VALUE

    const log = logger.builder().tab(+6)

    // re-parse with expanded syntaxes
    node.children = []
    node.resolve({ log, printLog: false, syntax: [`brackets`, `percentages`] })

    node.parser.root.simplify()
    node.parser.root.normalize() // i'm afraid of the consequences of normalizing the tree here, REMEMBER NOT TO EXPLICITALY REFERENCE NODES BY CONTEXT UNTIL ALL PARSING IS DONE

    // node.printRelevant({ sections: [`context`] })

    const nodes = node.children
    _value = this._stringify(node)

    // rebuild strinfified value as a formatted template
    let template = ``
    const components = [] as TagLazyComponent[]
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]

      const substring = node.substring.trim()
      if (node.syntax.name === `brackets` || node.syntax.name === `percentages`) {
        let type: TagLazyType = `input`
        if (node.syntax.name === `percentages`) type = `list`

        const text = removeWrapper(substring)

        const component = makeLazyComponent(components.length, type, text)
        components[component.id] = component

        template = `${template}{${component.id}}`
      } else {
        template = `${template}${substring}`
      }
    }

    const lazyValue = makeLazyValue(template, ...components)
    this.lazy = lazyValue

    return LAZY_VALUE
  }

  _math(previousParsedValue: ParsedValue<TValue>, node: INode) {
    if (previousParsedValue !== UNPARSED_VALUE) return previousParsedValue

    if (!this.definition.math) return UNPARSED_VALUE

    let _value = this._stringify(node)
    // const hasLazySpecialCharacters = _value.match(/[\[\]%]/g)

    // WARN: This will cause node to be reparsed, MUTATING something that is not supposed to be mutated

    node.resolveMath()
    const offspring = node.getOffspring()
    const syntaxes = uniq(offspring.map(node => node.syntax.name)).filter(name => name !== `math_expression`)

    if (syntaxes.includes(`math_function`)) {
      const functions = offspring.filter(node => node.syntax.name === `math_function`)

      for (const node of functions) {
        const marker = node.children[0].substring
        const name = node.children[1].substring

        const functionName = `${marker}${name}`

        const isUnrecognizedFunction = !LOGIC_RECOGNIZED_FUNCTIONS.includes(functionName)

        if (isUnrecognizedFunction)
          this.issues.push(
            createTraitIssue(`unrecognized_function_name`, {
              trait: this.tag.trait,
              tag: this.tag,
              node,
              //
              key: functionName,
            }),
          )
      }
    }

    return MATH_VALUE
  }

  _definition(previousParsedValue: ParsedValue<TValue>, node: INode) {
    if (previousParsedValue !== UNPARSED_VALUE) return previousParsedValue

    let value: unknown = UNPARSED_VALUE
    let nodes = node.children

    /**
     * Here we parse based on definition type, which is a generalization of expected type (not exactly a schema)
     * We can set in value something that doesnt necessarily match the schema, but thats a future problem
     */

    const { type } = this.definition
    const name = this.name
    const _value = this._stringify(node)

    // ERROR: There shouldnt be a unknown here, since TraiTag.parseValue() stops execution for "incomplete tag definition"
    if (type === `unknown`) debugger

    const ARRAY_TYPES = [`number[]`, `string[]`]

    if (ARRAY_TYPES.includes(type)) {
      const _array = this._definition_array(node)
      if (_array === UNPARSED_VALUE) value = UNPARSED_VALUE
      else {
        // could be parsed as array

        value = _array.map(component => {
          if (type === `number[]`) return this._definition_number(component)
          else if (type === `string[]`) return this._definition_string(component)

          // ERROR: Primitive handling for array not implemented
          //          Really dude? you added the type to the if FIVE LINES ABOVE!!!
          debugger

          return UNPARSED_VALUE
        })
      }
    } else if (this.definition.flag || type === `boolean`) {
      if (type !== `boolean`) debugger // wtf? there is an non-boolean flag?

      // any value in a flag means "true"
      //    so why am i considering "no" as false?
      value = this._definition_boolean(node)
    } else if (type === `string`) value = this._definition_string(node)
    else if (type === `number`) value = this._definition_number(node)
    else if (type === `range`) value = this._definition_range(node)
    else if (type === `number_suffixed`) value = this._definition_number_suffixed(node)
    else if (type === `dr`) value = this._definition_dr(node)
    else if (type === `progression`) value = this._definition_progression(node)
    else {
      // report the lack of implementation for this specific type as an issue
      this.issues.push(
        createTraitIssue(`missing_tag_type_implementation`, {
          trait: this.tag.trait,
          tag: this.tag,
          node: node,
          //
          key: this.name,
          types: nodes.map(node => guessNodeType(node)),
        }),
      )
    }

    return value as TValue
  }

  _name(parsedByDefinition: TValue, node: INode) {
    const _value = TraitTagValue.setupNode(node)
    const nodes = node.children

    let value: unknown = UNPARSED_VALUE

    // super specific parsing for specific tags
    if ([`name`, `displaycost`].includes(this.name)) {
      value = _value
    } else if ([`isparent`, `noresync`].includes(this.name)) {
      const isYes = _value.toLowerCase() === `yes`
      const isNo = _value.toLowerCase() === `no`

      if (isYes) value = true
      else if (isNo) value = false
      else {
        // ERROR: Unimplemented parsing for boolean tag
        debugger
      }
    } else if ([`cat`, `mods`, `page`].includes(this.name)) {
      if (isOnlyborn(nodes)) {
        // nodes is actually just [node]
        const node = nodes[0]
        const syntax = node.syntax

        if ([`comma`].includes(syntax.name)) {
          value = node.children.map(list => trimAndUnwrap(list, [`quotes`]))
        } else if ([`quotes`, `string`].includes(syntax.name)) {
          value = [trimAndUnwrap(node, [`quotes`])]
        } else {
          // ERROR: Unimplemented syntax for cat
          debugger
        }
      } else {
        // ERROR: What to do with multiple children?
        debugger
      }
    } else if ([`basecost`, `techlvl`].includes(this.name)) {
      const isValueNumeric = isNumeric(_value) || !isNaN(parseFloat(_value))

      if (isValueNumeric) {
        value = parseFloat(_value)
      } else {
        // ERROR: Unimplemented for non-numeric
        debugger
      }
    } else if ([`description`].includes(this.name)) {
      // TODO: How to determine if we should wrap colons?
      //    maybe check if all the colons are in the same level AND that level is immediate child of valueNode (that is an enclosure)

      debugger

      // const trait = this.trait._id
      // const context = this.valueNode.context
      // const substring = this.valueNode.substring

      // const colonIndexes = substring
      //   .split(``)
      //   .map((character, i) => (character === `:` ? i + this.valueNode.start : null))
      //   .filter(index => index !== null)

      // if (colonIndexes.length > 0) {
      //   const colonLevels = colonIndexes.map(index => this.valueNode.levelByIndex(index!))

      //   const isAnotherSeparatorAnImmediateChild = this.valueNode.children.every(child => child.syntax.type === `separator`)

      //   const areAllColonsAtSameLevel = uniq(colonLevels).length === 1 && colonLevels[0] !== -1
      //   const areAllColonsImmediateChildrenIgnoringOtherSeparators = colonLevels[0] === this.valueNode.level + 1 + (isAnotherSeparatorAnImmediateChild ? 2 : 0) // +2 to account for the pair separator > list

      //   if (areAllColonsImmediateChildrenIgnoringOtherSeparators && areAllColonsAtSameLevel) {
      //     this.valueNode.wrapSeparatorColon()

      //     const data = {} as Record<string, unknown>

      //     const separator = this.valueNode.children[0]
      //     for (const list of separator.children) {
      //       const [before, ...afters] = list.children

      //       const key = trimAndUnwrap(before, [`quotes`])
      //       const value = afters
      //         .map(after => after.substring)
      //         .join(``)
      //         .trim()

      //       // ERROR: Unimplemented repeating key
      //       if (data[key] !== undefined) debugger

      //       data[key] = value
      //     }

      //     value = data
      //   } else {
      //     console.error(chalk.bgRed(`${` `.repeat(50)}Unimplemented ${chalk.bold(`non-colon tag`)} for trait ${chalk.bold(trait)} at not ${chalk.bold(context)}${` `.repeat(50)}`))

      //     // ERROR: Non-colon node unimplemented (probably is gonna be just a string, maybe this if could become an UNPARSED instead of debugger, than i dont need to correct immediatly)
      //     debugger
      //   }
      // } else {
      //   // NO COLONS, just a regular string

      //   value = _value
      // }
    } else {
      console.log(chalk.bgWhite.bold(`${` `.repeat(45)} ${this.name} `))
      console.log(chalk.bgWhite.bold(`${` `.repeat(45)} ${_value} `))

      // ERROR: Unimplemented tag name
      debugger
    }

    return value as TValue
  }

  // #region DEFINITION PARSING

  // #region    PRIMITIVES

  _definition_string(node: INode, string?: string) {
    const _value = string === undefined ? this._stringify(node) : string

    // if (node.syntax.name === `quotes`) debugger // return removeWrapper(_value)

    return _value
  }

  _definition_boolean(node: INode) {
    let _value = this._stringify(node)

    // any value in a flag means "true"
    //    so why am i considering "no" as false?
    return _value.trim() !== `no`
  }

  _definition_literal_numeric(string: string) {
    // if it is not a numeric value, it could be some of the literals accepted as "number"
    const LITERAL_NUMBERS = [`neg.`, /Varies/, /No/i, `*`, `n/a`, `spcl.`]

    const isSomeLiteral = LITERAL_NUMBERS.some(literal => (isString(literal) ? literal === string : literal.test(string)))

    return isSomeLiteral
  }

  _definition_number(node: INode, string?: string) {
    const _value = string === undefined ? this._stringify(node) : string

    if (_value === ``) return undefined as any as number

    const _number = /^[-+]?[\d.,]+$/

    const isValueNumeric = _number.test(_value) && !isNaN(parseFloat(_value))
    if (isValueNumeric) return parseFloat(_value)

    // if it is not a numeric value, it could be some of the literals accepted as "number"
    if (this._definition_literal_numeric(_value)) return _value as any as number

    // there is some issue here, this is not a number (or number-like)
    this.issues.push(this._issue_unapproved_tag_type_values(node, [`number:non_numeric`]))

    return UNPARSED_VALUE
  }

  _definition_array(node: INode) {
    const _value = this._stringify(node)

    let target = node
    if (node.syntax.type === `enclosure`) {
      const nodes = node.children

      if (isOnlyborn(nodes)) target = nodes[0]
      else if (node.syntax.name === `parenthesis`) target = node
      else {
        debugger

        // there is some issue here, this is not a number (or number-like)
        this.issues.push(this._issue_unapproved_tag_type_values(node, [`array:non_onlyborn:non_parenthesis`]))
      }
    }

    if (target.syntax.type === `enclosure`) return [target]
    else if (target.syntax.name === `nil` || target.syntax.type === `string`) return [target]
    else if (target.syntax.type === `separator`) {
      if (target.syntax.name === `comma`) {
        return target.children
      } else {
        debugger
        this.issues.push(this._issue_unapproved_tag_type_values(target, [`array:non_comma`]))
      }
    } else if (target.syntax.type === `aggregator`) {
      // whut
      this.issues.push(this._issue_unapproved_tag_type_values(target, [`array:${target.syntax.name}`]))
    } else {
      debugger

      // whut
      this.issues.push(this._issue_unapproved_tag_type_values(target, [`array:non_primitive:non_separator`]))
    }

    return UNPARSED_VALUE
  }

  // #endregion

  // #region    COMPOSITES

  _definition_range(node: INode) {
    let _value = this._stringify(node)

    const hasDash = _value.includes(`-`)

    const isRange = hasDash

    const range = [NaN, NaN] as [Unparsed<number>, Unparsed<number>]

    if (isRange) {
      const components = _value.split(`-`)
      if (components.length !== 2) debugger // untested

      range[0] = this._definition_number(node, components[0])
      range[1] = this._definition_number(node, components[1])
    } else {
      range[0] = this._definition_number(node, _value)
      range.splice(1, 1)
    }

    // if something was unparsed, bail
    if (range[0] === UNPARSED_VALUE || range[1] === UNPARSED_VALUE) return UNPARSED_VALUE

    // ERROR: Nope
    if (range.some(value => isNaN(value as number))) debugger

    return range
  }

  _definition_number_suffixed(node: INode) {
    const _value = this._stringify(node)

    if (_value === ``) return undefined as any as Suffixed<number>

    const _number_suffixed = /([\d\.]+)(.*)/

    const match = _value.match(_number_suffixed)
    if (match) {
      const [, number, suffix] = match

      const suffixedNumber = { value: this._definition_number(node, number) } as Suffixed<number>
      if (!isNilOrEmpty(suffix)) suffixedNumber.suffix = this._definition_string(node, suffix)

      if (!isSymbol(suffixedNumber.value) && isNaN(suffixedNumber.value)) debugger // nope

      return suffixedNumber
    }

    // if it is not a numeric value, it could be some of the literals accepted as "number"
    if (this._definition_literal_numeric(_value)) return _value as any as number

    this.issues.push(this._issue_unapproved_tag_type_values(node, [`number_suffixed:no_match`]))

    return UNPARSED_VALUE
  }

  _definition_dr(node: INode) {
    const _value = this._stringify(node)

    const _number_suffixed = /([\d\.]+)([\\\/][\d\.]+)?(.*)/

    const match = _value.match(_number_suffixed)
    if (match) {
      const [, number1, _number2, suffix] = match
      const number2 = _number2?.replace(`/`, ``)

      const numbers = [this._definition_number(node, number1)] as Unparsed<number>[]
      if (!isNil(number2)) numbers.push(this._definition_number(node, number2))

      const suffixedNumber = { value: numbers } as Suffixed<[number, number]>
      if (!isNilOrEmpty(suffix)) suffixedNumber.suffix = this._definition_string(node, suffix)

      if (suffixedNumber.value.some(value => isNaN(value))) debugger // nope

      return suffixedNumber
    }

    // if it is not a numeric value, it could be some of the literals accepted as "number"
    if (this._definition_literal_numeric(_value)) return _value as any as number

    debugger

    return UNPARSED_VALUE
  }

  _definition_progression(node: INode) {
    const _value = this._stringify(node)

    const components = _value.split(`/`)
    const progression = components.map(component => this._definition_number(node, component))

    if (progression.some(value => isNaN(value as number))) debugger // nope

    return progression
  }

  // #endregion

  // #endregion

  // #region ISSUES

  _issue_unapproved_tag_type_values(node: INode, types: string[]) {
    const { type } = this.definition

    // CREATE THIS ISSUE TO HAVE A DEBUG TOOL PRINTED
    return createTraitIssue(`unapproved_tag_type_values`, {
      trait: this.tag.trait,
      tag: this.tag,
      node: node,
      //

      key: this.name,
      types,
    })
  }

  // #endregion
}

export class UnknownDefinitionTypeError extends Error {
  constructor(tagValue: TraitTagValue) {
    super(`Unknown Definition Type for "${tagValue.name}"`)
  }
}
export class UnimplementedDefinitionSpecializationError extends Error {
  constructor(tagValue: TraitTagValue, specializations: string[]) {
    super(`Unknown Definition Specialization${specializations.length > 1 ? `s` : ``} (${specializations.join(`, `)}) for "${tagValue.name}"`)
  }
}
