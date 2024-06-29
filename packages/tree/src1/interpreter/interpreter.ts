import createUnitIndex, { AlgebraicOperations, DifferentUnitsError, NumericUnitDecorator, Unit, UnitIndex } from "./units"
import util from "util"
import { get, has, isEmpty, isEqual, isFunction, isNil, last } from "lodash"
import {
  AccessorLogicalRepresentation,
  BaseLogicalRepresentation,
  ConnectiveLogicalRepresentation,
  EnumeratorLogicalRepresentation,
  IdentifierLogicalRepresentation,
  isLogicalRepresentation,
  LiteralLogicalRepresentation,
  LogicalRepresentation,
  MathematicalLogicalRepresentation,
} from "./representation"
import type { SyntaxNode } from ".."
import { Token } from "typescript"
import NodePrinter from "../printer"
import { typing } from "@december/utils"

interface IgnoreTokenProtocol {
  protocol: `ignore`
}

interface LiteralTokenProtocol<TValue = any> {
  protocol: `literal`
  source: string
  value: TValue
}

interface IdentifierTokenProtocol {
  protocol: `identifier`
  source: string
  value: string
}

interface OperatorTokenProtocol {
  protocol: `operator`
}

type TokenProtocol = IgnoreTokenProtocol | LiteralTokenProtocol | IdentifierTokenProtocol | OperatorTokenProtocol
type TokenPrococolType = TokenProtocol[`protocol`]

function isTokenProtocol<T extends TokenPrococolType>(protocol: TokenProtocol, type: T): protocol is Extract<TokenProtocol, { protocol: T }> {
  return protocol.protocol === type
}

export interface ProcessedObject {
  representation: LogicalRepresentation
  // VARIABLES (values to be extracted from scope)
  identifiers: Record<string, string[][]> // identifier name -> path[]
  functions: Record<string, string[][]> // function name -> path[]
  literals: Record<string, string[][]> // literal value -> path[]
}

export interface InterpreterOptions extends ProcessorOptions {
  validateScope: boolean
  strict: boolean
  fillScope: boolean
}

export interface ProcessorOptions {
  mode: `text` | `math`
  units: UnitIndex
}

export default class TreeInterpreter {
  // processor-only context
  __mode: ProcessorOptions[`mode`]
  __units: ProcessorOptions[`units`]

  // interpreter-only context
  __context: object
  __scope: object
  __strict: boolean

  constructor() {}

  scope(scope: object) {
    return {
      __invoke: (object: any, path: string) => {
        return get(object, path)
      },
      ...scope,
    }
  }

  // #region PROCESSING (node -> logical representation + variables A.K.A. ProcessedObject)

  process(node: SyntaxNode, options: Partial<ProcessorOptions> = {}): ProcessedObject {
    this.__mode = options.mode ?? `text`

    const intermediaryTree = this._processNode(node)!
    if (!intermediaryTree) debugger

    const scopeTemplate = { identifiers: {}, functions: {}, literals: {} } as Omit<ProcessedObject, `representation`>
    this._scope(scopeTemplate, intermediaryTree)

    return {
      representation: intermediaryTree,
      ...scopeTemplate,
    }
  }

  _processNode(node: SyntaxNode, __nullable = true): LogicalRepresentation | null {
    const children = node.children as SyntaxNode[]

    const baseSymbol = { node: node.context } as BaseLogicalRepresentation

    const protocol = this._decide(node)

    if (isTokenProtocol(protocol, `ignore`)) {
      // NOTE: Breakpoint to help check when a token that should not be null is null
      if (!__nullable) debugger

      return null
    }
    if (isTokenProtocol(protocol, `literal`)) return { ...baseSymbol, type: protocol.protocol, value: protocol.value, display: protocol.source } as LiteralLogicalRepresentation
    if (isTokenProtocol(protocol, `identifier`)) return { ...baseSymbol, type: protocol.protocol, name: protocol.value } as IdentifierLogicalRepresentation
    if (isTokenProtocol(protocol, `operator`)) {
      // LEFT/RIGHT nodes
      if ([`equals`, `and`, `or`, `invoker`, `greater`, `smaller`, `greater_than`, `smaller_than`, `multiplication`, `division`, `addition`, `subtraction`, `implicit_multiplication`].includes(node.syntax.name)) {
        // ERROR: Must have two children
        if (children.length !== 2) debugger

        // nullable variables (like -10, it is interpreted as null - 10, and this null should be 0)
        const nullable = [`addition`, `subtraction`].includes(node.syntax.name)

        let left = this._processNode(children[0], nullable)!
        let right = this._processNode(children[1], nullable)!

        // convert nulls to number literals
        if (!left) left = { type: `literal`, value: 0, display: `0`, node: children[0].context }
        if (!right) right = { type: `literal`, value: 0, display: `0`, node: children[1].context }

        const symbol = { ...baseSymbol, left, right } as Omit<ConnectiveLogicalRepresentation | MathematicalLogicalRepresentation, `type` | `operator`>

        if ([`and`, `or`].includes(node.syntax.name)) return { ...symbol, type: `connective`, operator: node.syntax.name as `and` | `or` }
        else if ([`equals`, `greater`, `smaller`, `greater_than`, `smaller_than`, `multiplication`, `division`, `addition`, `subtraction`, `implicit_multiplication`].includes(node.syntax.name)) {
          let operator = node.syntax.name as `equals` | `greater` | `smaller` | `greater_than` | `smaller_than` | `multiplication` | `division` | `addition` | `subtraction`

          if (node.syntax.name === `implicit_multiplication`) operator = `multiplication`

          return { ...symbol, type: `mathematical`, operator }
        } else if ([`invoker`].includes(node.syntax.name)) {
          // making right (the path invoked) a literal constant
          const path = right as LiteralLogicalRepresentation
          if (isLogicalRepresentation(right, `identifier`)) {
            // WARN: Never tested
            debugger

            path.type = `literal`
            path.display = right.name
            path.value = right.name
          }

          // ERROR: Could not parse
          if (path.type !== `literal`) debugger

          const accessor: AccessorLogicalRepresentation = {
            type: `accessor`,
            display: path.display,
            value: path.value,
            node: path.node,
          }

          return { ...symbol, type: `function`, name: `__invoke`, arguments: [left, accessor] }
        } else {
          // ERROR: Unimplemented
          debugger
        }
      }
      // STRING -> FUNCTION nodes
      else if (node.syntax.name === `string`) {
        const repr = node.repr()
        const content = repr.trim()

        return { ...baseSymbol, type: `function`, name: content, arguments: [] }
      }
      // FUNCTION nodes
      else if (node.syntax.name === `function`) {
        // ERROR: Must have two children
        if (children.length !== 2) debugger

        const name = this._processNode(children[0], false)! as IdentifierLogicalRepresentation | LiteralLogicalRepresentation
        if (![`identifier`, `literal`].includes(name.type)) debugger

        const grandChildren = children[1].children as SyntaxNode[] // arguments children
        const argumentsSingleChildIsComma = grandChildren.length === 1 && grandChildren[0].syntax.name === `comma`
        const argumentsSingleChildIsNotComma = grandChildren.length === 1 && grandChildren[0].syntax.name !== `comma`

        // parse commans (i.e. multiple arguments)
        let argumentsIR = [] as LogicalRepresentation[]
        if (argumentsSingleChildIsComma || argumentsSingleChildIsNotComma) {
          const comma = argumentsSingleChildIsNotComma ? { children: [grandChildren[0]] } : grandChildren[0]
          const IRs = (comma.children as SyntaxNode[]).map(node => this._processNode(node))
          const nonNilIRs = IRs.map(child =>
            !isNil(child)
              ? child
              : {
                  type: `variable`,
                  name: ``,
                },
          ) as LogicalRepresentation[]

          argumentsIR.push(...nonNilIRs)
        } else {
          debugger
        }

        const nameString = (get(name, `name`) ?? get(name, `value`))! as string

        // if (nameString === `@basethdice`) debugger
        return { ...baseSymbol, type: `function`, name: nameString, arguments: argumentsIR }
      }
      // IF nodes
      else if (node.syntax.name === `if` && node.syntaxSymbol === `master`) {
        const [condition, _if, _else] = children.map(child => this._processNode(child, false)!)

        return {
          ...baseSymbol,
          type: `conditional`,
          condition,
          consequent: _if,
          alternative: _else,
        }
      }
      // CONTEXT wrapper
      else if ([`parenthesis`, `eval`].includes(node.syntax.name)) {
        // $eval is handled at tree parsing level, so we can kind of ignore it (like a parenthesis)

        // ERROR: Eval must have two children (name and expression)
        if (node.syntax.name === `eval` && children.length !== 2) debugger

        const _children = node.syntax.name === `eval` ? (children[1].children as SyntaxNode[]) : children

        const isSingleChild = _children.length === 1

        // NOTE: How to handle this? Like, a math expression would have a single child
        if (!isSingleChild) debugger

        const processedChildren = _children.map(child => this._processNode(child))

        const nonNilChildren = processedChildren.filter(Boolean) as LogicalRepresentation[]
        if (nonNilChildren.length !== 1) debugger

        return nonNilChildren[0]
      }
      // generic MANY CHILDRENS approach
      else if ([`imaginary`, `list`, `quotes`, `if`].includes(node.syntax.name) || [`separator`].includes(node.syntax.type)) {
        const processedChildren = children.map(child => this._processNode(child))

        const shouldBeSingleChild = [`imaginary`, `list`, `if`].includes(node.syntax.name)
        const couldBeSingleChild = node.syntax.name === `quotes` && processedChildren.length === 1 // could be, idk

        const returnSingleChild = shouldBeSingleChild || couldBeSingleChild

        if (returnSingleChild) {
          const nonNilChildren = processedChildren.filter(Boolean) as LogicalRepresentation[]

          if (this.__mode === `text`) {
            if (nonNilChildren.length === 0) debugger
            else if (nonNilChildren.length === 1) return nonNilChildren[0]
            else {
              const enumerator: EnumeratorLogicalRepresentation = {
                type: `enumerator`,
                list: nonNilChildren,
                node: node.context,
              }

              return enumerator
            }
          } else {
            // ERROR: How to handle many children if final result is not a text?
            if (nonNilChildren.length !== 1) debugger

            return nonNilChildren[0]
          }
        }

        // ERROR: How to handle returning many children???
        debugger
      } else {
        // ERROR: Unimplemented syntax definition key
        debugger
      }
    }

    // ERROR: Unimplemented token protocol
    debugger
    return null
  }

  /** Compiles a index with all keys that should be in a valid scope */
  _scope(variables: Omit<ProcessedObject, `representation`>, intermediaryRepresentation: LogicalRepresentation, path: string[] = []) {
    // const variables = { identifiers: {}, functions: {} } as Omit<ProcessedObject, `representation`>

    if (!intermediaryRepresentation) debugger

    if (intermediaryRepresentation.type === `accessor`) {
      // do nothing
    } else if (intermediaryRepresentation.type === `literal`) {
      variables[`literals`][intermediaryRepresentation.value] ??= []
      variables[`literals`][intermediaryRepresentation.value].push(path)
    } else if (intermediaryRepresentation.type === `enumerator`) {
      for (const [index, child] of intermediaryRepresentation.list.entries()) {
        this._scope(variables, child, [...path, `list`, index.toString()])
      }
    } else if (intermediaryRepresentation.type === `conditional`) {
      this._scope(variables, intermediaryRepresentation.condition, [...path, `condition`])
      this._scope(variables, intermediaryRepresentation.consequent, [...path, `consequent`])
      this._scope(variables, intermediaryRepresentation.alternative, [...path, `alternative`])
    } else if (intermediaryRepresentation.type === `connective` || intermediaryRepresentation.type === `mathematical`) {
      this._scope(variables, intermediaryRepresentation.left, [...path, `left`])
      this._scope(variables, intermediaryRepresentation.right, [...path, `right`])
    } else if (intermediaryRepresentation.type === `identifier` || intermediaryRepresentation.type === `function`) {
      const target = intermediaryRepresentation.type === `function` ? `functions` : `identifiers`

      variables[target][intermediaryRepresentation.name] ??= []
      variables[target][intermediaryRepresentation.name].push(path)

      if (intermediaryRepresentation.type === `function`) {
        intermediaryRepresentation.arguments.forEach((argument, index) => this._scope(variables, argument, [...path, `arguments`, index.toString()]))
      }
    } else {
      // ERROR: Unimplemented symbol type
      debugger
    }
  }

  _decide(node: SyntaxNode): TokenProtocol {
    const symbol = node.getSyntaxSymbol()
    const tags = [...node.syntax.tags, ...(symbol?.tags ?? [])]

    // 1. consider tags and if node is, ultimatelly, primitive
    const acceptsLogical = tags.includes(`accepts_logical`)
    const isDeepPrimitive = tags.includes(`deep_primitive`) || node.isDeepPrimitive()
    const isInvokerParameter = (node.parent as SyntaxNode)?.syntax.name === `invoker` && node.syntax.name === `invoker`

    const isIdentifierOrLiteral = !acceptsLogical && (isDeepPrimitive || isInvokerParameter)

    // 2. confirm if node is a identifier (named variable) or literal (number, string, boolean values)
    if (isIdentifierOrLiteral) {
      // 2.1. get node string representation
      const repr = node.repr()
      const _content = repr.trim()

      // 2.2. if it is an empty string, ignore token (node) entirely
      if (isEmpty(_content)) return { protocol: `ignore` }

      // 2.3. token represents an identifier
      let content = _content
      content = content.startsWith(`"`) && content.endsWith(`"`) ? content.slice(1, -1) : content // removing quotes

      const isNumber = !isNaN(Number(content)) // check if content is a valid number

      const hasTraitTag = !!content.match(/^\w{2}:/) // XX: Adfsodf (ASDFNS skdfs)
      const isSpecialCaseSubstitution = !!content.match(/^\%(level|count)$/)

      const isFunction = isSpecialCaseSubstitution
      const isIdentifier = hasTraitTag
      const isLiteral = isNumber || !isIdentifier

      // 2.3. token represents a literal value
      if (isFunction) return { protocol: `operator` }

      if (isLiteral) return { protocol: `literal`, source: repr, value: isNumber ? Number(content) : content }

      return { protocol: `identifier`, source: repr, value: content }
    }

    // 3. only operator remains
    return { protocol: `operator` }
  }

  // #endregion

  // #region INTERPRETING (logical object -> result)

  validateScope(object: ProcessedObject, scope: object) {
    const variables = [
      //
      ...Object.keys(object.identifiers),
      ...Object.keys(object.functions),
    ]

    const keys = Object.keys(scope)
    const missingVariables = variables.filter(variable => !keys.includes(variable))

    const result = { isValid: missingVariables.length === 0 } as { isValid: true } | { isValid: false; missing: string[] }
    if (!result.isValid) result.missing = missingVariables

    return result
  }

  interpret(object: ProcessedObject, scope: object, { validateScope, fillScope, strict, mode, units }: Partial<InterpreterOptions> = { strict: true }) {
    if (validateScope) {
      // verify if scope has all variables
      const validation = this.validateScope(object, scope)
      if (!validation.isValid) {
        if (!fillScope) debugger
        else {
          for (const key of validation.missing) {
            scope[key] = null
          }
        }
      }
    }

    // store scope to facilitate computations
    this.__scope = scope
    this.__strict = strict ?? true
    this.__mode = mode ?? `text`
    this.__units = units ?? createUnitIndex()

    return this._interpretIR(object.representation, [], null)
  }

  _interpretIR(representation: LogicalRepresentation, path: (string | number)[], parent: LogicalRepresentation | null) {
    const scope = this.__scope
    // ERROR: Missing scope
    if (!scope) debugger

    if (representation.type === `accessor`) {
      return representation.value
    }

    if (representation.type === `literal`) {
      // numeric literals
      const isNumber = !isNaN(representation.value)
      if (isNumber) return new NumericUnitDecorator(representation.value)

      // numeric constant literals
      const isPresentInScope = has(scope, representation.value)
      if (isPresentInScope) {
        const scopedValue = scope[representation.value]

        return scopedValue
      }

      // unit literals
      // TODO: How to reliably check if it is a unit literal?
      const unit = this.__units.match(representation.value)
      if (unit) return unit

      // TODO: Generate a report of all "missing" variables in scope

      // unit? undeclared constant? text?
      return representation.value
    }

    if (representation.type === `enumerator`) {
      if (this.__mode === `math`) {
        // if a mode math have enumerators, then we should calculate each one individually and THEN concatenate the results, only to calculate the result after
        const components = representation.list.map((child, index) => this._interpretIR(child, [...path, `list`, index], representation))
        const _components = components.map(component => {
          if (!typing.isTyped(component)) return typeof component

          const types = typing.getTypes(component)
          if (types.length !== 1) debugger

          return last(types)
        })

        // this concatenation is, most likely, implicit multiplication.
        // this sucks.

        // NOTE: This implementation sounds extremely complex. I'm going to do it in a very dumb way, case by case, and then refactor it
        if (components.length !== 2) debugger

        // A) <number><number>
        //      doesnt exist. <number><number> is just <number>; a multiplication would be <number>*<number>
        //      the parser shouldnt even return something like this
        if (isEqual(_components, [`NumericUnitDecorator`, `number`])) debugger

        // B) <number><string>
        //      undetected unit???
        if (isEqual(_components, [`NumericUnitDecorator`, `string`])) debugger

        // C) <number><Unit>
        //      numeric literal * unit of measurement
        //      so... just apply unit to the number with a NumericUnitDecorator
        if (isEqual(_components, [`NumericUnitDecorator`, `Unit`])) {
          const [number, unit] = components as [NumericUnitDecorator, Unit]

          // ERROR: Unimplemented unit
          if (!unit) debugger

          return unit.decorate(number)
        }

        // ERROR: Unfinished enumerator interpretation
        debugger
      } else {
        // if (this.__mode === `text`)
        debugger
      }
    }

    if (representation.type === `identifier` || representation.type === `function`) {
      // ERROR: Missing variable/function value in scope
      if (!has(scope, representation.name)) throw new Error(`Missing ${representation.type} "${representation.name}" in scope`)

      if (representation.type === `identifier`) return scope[representation.name]

      if (representation.type === `function`) {
        const fn = scope[representation.name]

        const _arguments = representation.arguments.map((argument, index) => this._interpretIR(argument, [...path, index], representation))
        const value = fn.call(this.__scope, ..._arguments)

        return value
      }
    }

    if (representation.type === `conditional`) {
      const conditional = this._interpretIR(representation.condition, [...path, `condition`], representation)

      return conditional ? this._interpretIR(representation.consequent, [...path, `consequent`], representation) : this._interpretIR(representation.alternative, [...path, `alternative`], representation)
    }

    if (representation.type === `connective` || representation.type === `mathematical`) {
      const left = this._interpretIR(representation.left, [...path, `left`], representation)
      const right = this._interpretIR(representation.right, [...path, `right`], representation)

      // handle implicit multiplication of number * unit (which is just decorating a number with a unit)
      const isRightAnUnit = Unit.isUnit(right)
      if (representation.operator === `multiplication` && isRightAnUnit) return right.decorate(left)

      // ERROR: wtf is tis? a random unit here????
      const isLeftAnUnit = Unit.isUnit(left)
      if (isLeftAnUnit || isRightAnUnit) debugger

      // check if operation will throw an error (i dont like the try...catch look and feel here)
      const operationError = NumericUnitDecorator.testOperation(representation.operator, left, right)
      if (operationError) {
        if (operationError.name === `DifferentUnitsError` || operationError.name === `UnexpectedTypeError`) {
          // if both sides are not numeric-like, then we should concatenate them
          const operator =
            representation.operator === `addition` ? `+` : representation.operator === `subtraction` ? `-` : representation.operator === `multiplication` ? `*` : representation.operator === `division` ? `/` : `wtf is tis shii`
          return `${String(left)} ${operator} ${String(right)}`
        }

        // ERROR: Cannot perform operation, some error occurred
        debugger
      }

      const result = NumericUnitDecorator.operation(representation.operator, left, right)

      // non algebraic operation, just return primitive value (MUST BE PRIMITIVE)
      if ([`and`, `or`, `equals`, `greater`, `smaller`, `greater_than`, `smaller_than`].includes(representation.operator)) {
        // ERROR: Must be a primitive value
        if (NumericUnitDecorator.isNumericUnitDecorator(result)) debugger

        return result
      }

      return result
    }

    // ERROR: Unimplemented symbol type
    debugger
    return null as any
  }

  // #endregion

  // #region PRINTING

  print(object: ProcessedObject) {
    const serialized = {
      representation: object.representation,
      identifiers: Object.keys(object.identifiers),
      functions: Object.keys(object.functions),
    }

    console.log(util.inspect(serialized, { showHidden: false, depth: null, colors: true }))
  }

  // #endregion
}
