import { ArrayNode } from "mathjs"
import { makeSyntaticComponent } from "../component"
import { MathSyntaxNames, SyntaxComponent } from "../types"

export type MathJSNodeTypes = `OperatorNode` | `FunctionNode` | `SymbolNode` | `ConstantNode` | `ParenthesisNode` | `ArrayNode`

export const MathJSOperatorNodeMap = {
  xor: `xor`,
  and: `and`,
  or: `or`,
  bitOr: `|`,
  bitXor: `^|`,
  bitAnd: `&`,
  equal: `==`,
  unequal: `!=`,
  smaller: `<`,
  larger: `>`,
  smallerEq: `<=`,
  largerEq: `>=`,
  leftShift: `<<`,
  rightArithShift: `>>`,
  rightLogShift: `>>>`,
  to: `to`,
  add: `+`,
  subtract: `-`,
  multiply: `*`,
  divide: `/`,
  dotMultiply: `.*`,
  dotDivide: `./`,
  mod: `mod`,
  unaryPlus: `+`,
  unaryMinus: `-`,
  bitNot: `~`,
  not: `not`,
  pow: `^`,
  dotPow: `.^`,
  factorial: `!`,
}

export const MathJSInverseOperatorNodeMap = Object.fromEntries(Object.entries(MathJSOperatorNodeMap).map(([k, v]) => [v, k])) as Record<string, string>

export type MathOperators = keyof typeof MathJSOperatorNodeMap

export const MATH_SYNTAX_COMPONENTS = {
  math_expression: makeSyntaticComponent(`math`, `math_expression`, `e`, []),
  //
  math_operator: makeSyntaticComponent(`separator`, `math_operator`, `o`, [`+`, `-`, `/`, `*`, `x`, `^`, `=`], {
    parents: [`imaginary`, `parenthesis`, `math_expression`, `list`],
    prio: {
      "+": 1.2,
      "-": 1.2,
      "/": 1.5,
      "*": 1.5,
      x: 1.5,
      "^": 1.7,
      "=": 1.01,
    },
  }),
  math_function: makeSyntaticComponent(`aggregator`, `math_function`, `@`, [], { prio: 15 }),
  math_number: makeSyntaticComponent(`math`, `math_number`, `n`, []),
  math_variable: makeSyntaticComponent(`math`, `math_variable`, `v`, []),
  // math_operator: makeMathComponent<MathOperatorSyntaxComponent>(`math_operator`, `∮`),
  // math_constant: makeMathComponent<MathOperatorSyntaxComponent>(`math_constant`, `∀`),
  // math_symbol: makeMathComponent<MathOperatorSyntaxComponent>(`math_symbol`, `∑`),
  // math_parenthesis: makeMathComponent<MathOperatorSyntaxComponent>(`math_parenthesis`, `ρ`),
  // math_array: makeMathComponent<MathOperatorSyntaxComponent>(`math_array`, `β`),
} as Partial<Record<MathSyntaxNames, SyntaxComponent>>

export const MATH_SYNTAX_NAMES = Object.keys(MATH_SYNTAX_COMPONENTS) as MathSyntaxNames[]

// export const MATH_REGEX_CHARACTERS = new RegExp(`(+|-|/|*|x|^)`, `g`)

export function mathJSNodeTypeToSyntaxName(nodeType: MathJSNodeTypes): MathSyntaxNames {
  switch (nodeType) {
    case `OperatorNode`:
      return `math_operator`
    case `FunctionNode`:
      return `math_function`
    // case `SymbolNode`:
    //   return `math_symbol`
    // case `ConstantNode`:
    //   return `math_constant`
    // case `ParenthesisNode`:
    //   return `math_parenthesis`
    // case `ArrayNode`:
    //   return `math_array`
  }

  // ERROR: Unimplemented mathjs node type
  debugger

  return null as any
}
