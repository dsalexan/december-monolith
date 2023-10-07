import { ArrayNode, ConstantNode, MathNode, OperatorNode, ParenthesisNode, SymbolNode, isIndexNode } from "mathjs"
import { TraitParser } from ".."
import MathObject from "../syntax/math/object"
import { ImplicitOption, ParenthesisOption, calculateNecessaryParentheses } from "../syntax/math/utils"
import { TraitParserNode } from "."
import { SYNTAX_COMPONENTS } from "../syntax"
import { PostProcessedMathNode } from "../syntax/math"
import { isNil, last } from "lodash"
import { mathJSNodeTypeToSyntaxName } from "../syntax/math/syntax"

export type MathJSNodeToStringOptions = { parenthesis: ParenthesisOption; implicit: ImplicitOption; originalSpacing?: boolean }

export class MathNodeParser {
  parser: TraitParser
  start: number
  mathObject: MathObject

  constructor(parser: TraitParser, start: number, mathObject: MathObject) {
    this.parser = parser
    this.start = start
    this.mathObject = mathObject
  }

  parse(options: Partial<MathJSNodeToStringOptions> = {}) {
    const node = this.parseNode(this.mathObject.node, this.start, options)

    return node
  }

  parseNode(mathNode: MathNode, cursor = 0, options: Partial<MathJSNodeToStringOptions> = {}) {
    const _options = getDefaultOptions(options)

    let node = null as any as TraitParserNode

    const DEBUG_TO_STRING = (mathNode as any)._toString()

    if (mathNode.type === `ConstantNode` || mathNode.type === `SymbolNode`) {
      const string = toString(mathNode, _options)
      let data = {} as any

      if (mathNode.type === `ConstantNode`) {
        data = { value: (mathNode as ConstantNode).value }
      } else if (mathNode.type === `SymbolNode`) {
        data = { name: (mathNode as SymbolNode).name }
      }

      node = new TraitParserNode(this.parser, null, 0, cursor, SYNTAX_COMPONENTS[mathJSNodeTypeToSyntaxName(mathNode.type)], data)
      node.end = cursor + string.length - 1
    } else if (mathNode.type === `OperatorNode`) {
      node = this.parseOperatorNode(mathNode as OperatorNode, cursor, _options)
    } else if (mathNode.type === `ParenthesisNode`) {
      node = this.parseParenthesisNode((mathNode as ParenthesisNode).content, cursor, true, _options)
    } else if (mathNode.type === `ArrayNode`) {
      debugger
      // advance cursor once to account for open brackets
      node = new TraitParserNode(this.parser, null, 0, cursor++, SYNTAX_COMPONENTS.list) // .math_array

      for (const item of (mathNode as ArrayNode).items) {
        const child = this.parseNode(item, cursor, _options)
        child.id = node.children.length
        node.addChild(child)
      }

      // advance cursor once to account for open brackets
      node.end = last(node.children)!.end! + 1
      cursor += node.end! - node.start
    } else if (mathNode.type === `RangeNode`) {
      debugger
    } else {
      // ERROR: Unimplemented node type

      /**
       * How to implement?
       *
       * - Go to type node in mathjs (mathjs/lib/esm/expression/node/<NodeType>.js)
       * - Check "DEBUG_TO_STRING"
       */
      debugger
    }

    // VALIDATE
    const string = toString(mathNode, { ..._options, originalSpacing: true })

    if (node.substring !== string) {
      // ERROR: Parsed math node string is not a match to traitParserNode substring
      debugger
    }

    // ERROR: Cannot send back an unbalanced node
    if (isNil(node.end)) debugger

    // ERROR: Cannot send back a node lacking a syntax
    if (isNil(node.syntax)) debugger

    return node
  }

  parseOperatorNode(operatorNode: OperatorNode, cursor = 0, options: MathJSNodeToStringOptions) {
    const op = operatorNode.op as string
    const parens = calculateNecessaryParentheses(operatorNode, options.parenthesis, options.implicit, operatorNode.args, false)

    const node = new TraitParserNode(this.parser, null, 0, cursor, SYNTAX_COMPONENTS.math_operator)

    // ERROR: wtf
    if (isMathNodeLeaf(operatorNode)) debugger

    if (operatorNode.args.length === 1) {
      debugger
    } else if (operatorNode.args.length === 2) {
      const lhsString = wrapParens(toString(operatorNode.args[0], options), parens[0]) // left hand side
      const rhsString = wrapParens(toString(operatorNode.args[1], options), parens[0]) // right hand side

      const fowardString = this.parser.text.substring(cursor)

      const [SPACING_BEFORE, SPACING_AFTER] = calculateOriginalSpacingForBinaryNode(fowardString, lhsString, op, rhsString)

      // @ts-ignore
      operatorNode.spacing = [SPACING_BEFORE, SPACING_AFTER]

      // parse left hand side (with or without parens)
      const lhs = this.parseParenthesisNode(operatorNode.args[0], cursor, parens[0], options)
      lhs.id = node.children.length
      node.addChild(lhs)

      // advance cursor by entirety of lhs
      cursor += lhs.end! - lhs.start + 1

      // advance cursor by operator + spacing lenght
      const hideOp = operatorNode.implicit && getIdentifier(operatorNode) === `OperatorNode:multiply` && options.implicit === `hide`
      if (!hideOp) {
        node.middles.push(cursor + SPACING_BEFORE.length)
        cursor += SPACING_BEFORE.length + op.length + SPACING_AFTER.length
      }

      // parse right hand side (with or without parens)
      const rhs = this.parseParenthesisNode(operatorNode.args[1], cursor, parens[0], options)
      rhs.id = node.children.length
      node.addChild(rhs)

      // advance cursor by entirety of rhs
      cursor += rhs.end! - rhs.start + 1
    } else if (operatorNode.args.length === 3) {
      debugger
    } else {
      debugger
    }

    node.end = last(node.children)!.end

    return node
  }

  parseParenthesisNode(mathNode: MathNode, cursor: number, wrapParens = false, options: MathJSNodeToStringOptions) {
    let parenthesisNode = null as any as TraitParserNode

    if (wrapParens) {
      // create left parenthesis node and advance cursor by one, accounting for open parens
      parenthesisNode = new TraitParserNode(this.parser, null, 0, cursor++, SYNTAX_COMPONENTS.parenthesis) // .math_parenthesis
    }

    // create left hand side at cursor (parseNode always returns a balanced node)
    const childNode = this.parseNode(mathNode, cursor, options) // left hand side
    if (wrapParens) {
      // add lhs to left parenthesis
      childNode.id = parenthesisNode!.children.length
      parenthesisNode!.addChild(childNode)
      parenthesisNode!.end = childNode.end! + 1 // end is +1 to account for close parens

      // advance cursor by entirety of left parenthesis
      cursor += parenthesisNode!.end - parenthesisNode!.start
    }

    return wrapParens ? parenthesisNode : childNode
  }

  parseNode2(node: MathNode, options: Partial<MathJSNodeToStringOptions> = {}) {
    const _options = getDefaultOptions(options)

    if (node.type === `ConstantNode`) {
      const string = toString(node, _options)

      let start = 0

      const constant = new TraitParserNode(this.parser, null, 0, start, SYNTAX_COMPONENTS.math_variable) // .math_constant
      constant.end = start + string.length - 1
      // components.push(...constantNodeToString(node as ConstantNode, _options))
    } else if (node.type === `OperatorNode`) {
      // components.push(...operatorNodeToRepr(node as OperatorNode, _options))
    } else {
      // ERROR: Unimplemented node type
      debugger
    }

    return null
  }
}

// #region UTILS

type MathJSNodeCallback = (mathNode: PostProcessedMathNode, path: string | null, parent: PostProcessedMathNode | null) => void

function traverse(node: PostProcessedMathNode, callback: MathJSNodeCallback) {
  node.traverse(callback as (node: MathNode, path: string, parent: MathNode) => void)
}

function getIdentifier(node: MathNode) {
  return (node as any).getIdentifier() as string
}

function _toString(node: MathNode, options: MathJSNodeToStringOptions) {
  return (node as any)._toString(options) as string
}

function getDefaultOptions(options: Partial<MathJSNodeToStringOptions> = {}) {
  const parenthesis = options.parenthesis ? options.parenthesis : `keep`
  const implicit = options.implicit ? options.implicit : `hide`

  return { ...options, parenthesis, implicit } as MathJSNodeToStringOptions
}

function wrapParens(text: string, wrap: boolean = true) {
  return wrap ? `(${text})` : text
}

function calculateOriginalSpacingForBinaryNode(originalString: string, left: string, center: string, right: string) {
  // const lhsString = wrapParens(toString(operatorNode.args[0], options), parens[0]) // left hand side
  // const rhsString = wrapParens(toString(operatorNode.args[1], options), parens[0]) // right hand side

  // const fowardString = this.parser.text.substring(cursor)
  const leftStart = originalString.indexOf(left)
  const centerAndRight = originalString.substring(leftStart + left.length)
  const rightStart = centerAndRight.indexOf(right)
  const centerAndSpacing = centerAndRight.substring(0, rightStart)

  return centerAndSpacing.split(center)
}

// #endregion

// #region NODE TYPES

// #region LEAF

function isMathNodeLeaf(node: MathNode) {
  if (node.type === `ConstantNode`) {
    return true
  } else if (node.type === `OperatorNode`) {
    return (node as OperatorNode).args.length === 0
  } else {
    // ERROR: Unimplemented node type
    debugger
  }

  return false
}

// #endregion

// #region TO STRING

export function toString(node: MathNode, options: Partial<MathJSNodeToStringOptions> = {}): string {
  const _options = getDefaultOptions(options)

  if (node.type === `ConstantNode`) {
    return constantNodeToString(node as ConstantNode, _options).join(``)
  } else if (node.type === `SymbolNode`) {
    return symbolNodeToString(node as SymbolNode, _options).join(` `)
  } else if (node.type === `OperatorNode`) {
    const components = operatorNodeToString(node as OperatorNode, _options)

    if (!_options.originalSpacing) return components.join(` `)

    if (components.length === 3) {
      const [lhs, op, rhs] = components
      const [SPACING_BEFORE, SPACING_AFTER] = (node as any).spacing as [string, string]

      return `${lhs}${SPACING_BEFORE}${op}${SPACING_AFTER}${rhs}`
    } else {
      debugger
    }
  } else if (node.type === `ParenthesisNode`) {
    return parenthesisNodeToString(node as ParenthesisNode, _options).join(` `)
  } else if (node.type === `ArrayNode`) {
    const components = arrayNodeToString(node as ArrayNode, _options)

    return `[${components.join(`, `)}]`
  }

  // ERROR: Unimplemented node type
  debugger

  return ``
}

function constantNodeToString(node: ConstantNode, options: MathJSNodeToStringOptions) {
  const components = [] as string[]

  const string = _toString(node, options)
  components.push(string)

  return components
}

function symbolNodeToString(node: SymbolNode, options: MathJSNodeToStringOptions) {
  return [node.name]
}

function operatorNodeToString(node: OperatorNode, options: MathJSNodeToStringOptions) {
  const components = [] as string[]

  let parens = calculateNecessaryParentheses(node, options.parenthesis, options.implicit, node.args, false)

  if (node.args.length === 1) {
    debugger
  } else if (node.args.length === 2) {
    let lhs = toString(node.args[0], options) // left hand side
    let rhs = toString(node.args[1], options) // right hand side

    const hideOp = node.implicit && getIdentifier(node) === `OperatorNode:multiply` && options.implicit === `hide`

    components.push(wrapParens(lhs, parens[0]))
    if (!hideOp) components.push(node.op)
    components.push(wrapParens(rhs, parens[1]))
  } else if (node.args.length === 3) {
    debugger
  } else {
    debugger
  }

  return components
}

function parenthesisNodeToString(node: ParenthesisNode, options: MathJSNodeToStringOptions) {
  const content = toString(node.content, options)
  return [wrapParens(content, options.parenthesis === `keep`)]
}

function arrayNodeToString(node: ArrayNode, options: MathJSNodeToStringOptions) {
  const components = [] as string[]

  for (const item of node.items) {
    components.push(toString(item, options))
  }

  return components
}

// #endregion

// #endregion
