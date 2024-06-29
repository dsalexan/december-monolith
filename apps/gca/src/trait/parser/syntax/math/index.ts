import { isFunction, isNil, omit, set } from "lodash"
import { ConstantNode, FunctionNode, MathJsStatic, MathNode, OperatorNode, ParenthesisNode, SymbolNode, create, all, typeOf, isNumeric } from "mathjs"

import _if from "./functions/if"

import churchill from "../../../../logger"
import preprocessExpression from "./preprocess"
import MathObject from "./object"

export const logger = churchill.child(`math`)

export { MATH_SYNTAX_COMPONENTS } from "./syntax"

export const MISSING_VALUE = Symbol.for(`MATHJS_MISSING_VALUE`)
export type MathScope = Map<string, typeof MISSING_VALUE | number | null>
export type PathedMathNode<TNode extends MathNode = MathNode> = { node: TNode; path: string; parent: MathNode }
export type PostProcessedMathNode<TNode extends MathNode = MathNode> = TNode & { path: string; parent: MathNode }

let MATHJS_INSTANCE = undefined as unknown as MathJsStatic

export function getMathJsInstance() {
  if (isNil(MATHJS_INSTANCE)) {
    // create vanilla intance
    const math = create(all)

    // import custom functions
    math.import(
      {
        AT_if: _if,
        // AT_int: _int,
        // AT_hasmod: _hasmod,
        // multiply: _multiply,
      },
      { override: true },
    )

    MATHJS_INSTANCE = math
  }

  return MATHJS_INSTANCE
}

export function extractScope(node: MathNode, baseScope: { [k: string]: number | null } = {}) {
  const math = getMathJsInstance()
  const scope = new Map() as MathScope

  // const allNodes = [] as PathedMathNode<MathNode>[]
  // node.forEach((node: MathNode, path: string, parent: MathNode) => allNodes.push({ node, path, parent } as PathedMathNode<MathNode>))

  const symbolsAndConstants = node.filter((node: MathNode) => [`SymbolNode`, `ConstantNode`].includes(node.type))

  for (let i = 0; i < symbolsAndConstants.length; i++) {
    const childNode = symbolsAndConstants[i]

    if (childNode.type === `SymbolNode`) {
      const symbolNode = childNode as SymbolNode

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isMathematicalSymbol = (math as any)[symbolNode.name] !== undefined
      const isAlreadyPresentInBaseScope = baseScope[symbolNode.name] !== undefined

      if (isMathematicalSymbol || isAlreadyPresentInBaseScope) continue

      scope.set(symbolNode.name, MISSING_VALUE)
    } else if (childNode.type === `ConstantNode`) {
      const constantNode = childNode as ConstantNode

      const isValueNumeric = isNumeric(constantNode.value)

      if (isValueNumeric) continue

      scope.set(constantNode.value.toString(), MISSING_VALUE)
    } else {
      // ERROR: Unimplemented
      debugger
    }
  }

  // inject baseScope into scope
  // scope.set(`__me`, me) // no need to treat "me" differently, just add it as {"__me": <object>} in base scope
  if (baseScope) for (const [key, value] of Object.entries(baseScope)) scope.set(key, value)

  return scope
}

function postprocess(mathNode: MathNode) {
  // index nodes
  mathNode.traverse(function (_node, path, _parent) {
    const node = _node as PostProcessedMathNode
    const parent = _parent as PostProcessedMathNode

    if (!parent) node.path = ``
    else node.path = `${parent.parent ? `${parent.path}.` : ``}${path}`

    node.parent = parent
  })

  return mathNode
}

export function parse(originalExpression: string) {
  const math = getMathJsInstance()

  const expression = originalExpression
  // const expression = preprocessExpression(originalExpression)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: MathNode = null as any
  try {
    node = math.parse(expression)
  } catch (error) {
    return null
  }

  // ERROR: Unimplemented lack of parsing
  if (!node) debugger

  const scope = extractScope(node)
  postprocess(node)

  const object = new MathObject(expression, node as PostProcessedMathNode, scope)

  return object

  // const scope = buildScope(node, me, {})

  // const code = node.compile()
  // const _value = code.evaluate(scope)
}
