import assert from "assert"
import { MaybeArray } from "tsdef"
import { isArray, isString, omit } from "lodash"

import { Range, typing } from "@december/utils"
import { isUnit, IUnit, Quantity } from "@december/utils/unit"

import Node from "."
import Token from "../token"
import { ConcreteString, ProvidedString } from "../string"

import Type from "../type/base"
import { BOOLEAN, NIL, NUMBER, QUANTITY, STRING, UNIT, PRIMITIVE_LITERALS, PrimitiveLiteral, PRIMITIVE_LITERAL_NAMES, PrimitiveLiteralName, LITERALS_BY_NAME } from "../type/declarations/literal"
import { FUNCTION, LIST } from "../type/declarations/enclosure"
import { ROOT } from "../type/declarations/structural"
import { STRING_COLLECTION } from "./../type/declarations/literal"
import { OPERATORS_BY_NAME, OperatorType, OperatorTypeName, SIGN } from "../type/declarations/operator"
import { IDENTIFIER } from "../type/declarations/identifier"
import { evaluateNodeScope, MasterScope } from "./scope"
import { LexemeEvaluateFunction } from "../phases/lexer/evaluation"

type StringObject = ProvidedString | ConcreteString | string
type GuessableVariableType = typing.VariableType | `quantity`

export interface NodeFactoryOptions {
  range: Range
  type: Type
}

export interface NodeFactoryGlobalSettings {
  masterScope: MasterScope
}

export default class NodeFactory {
  public static abstract = new NodeFactory({ masterScope: null as any })
  //
  settings: NodeFactoryGlobalSettings

  public constructor(settings: NodeFactoryGlobalSettings) {
    this.settings = settings
  }

  public makeToken(value: StringObject, type: Type): Token {
    const string: ProvidedString | ConcreteString = isString(value) ? { type: `concrete`, value } : value

    const token = new Token(string, type)

    return token
  }

  private fromString(value: StringObject, type: Type): Node {
    const token = this.makeToken(value, type)
    return this.fromToken(token)
  }

  private fromToken(token: Token): Node {
    return new Node(token)
  }

  private fromType(type: Type, range: Range): Node {
    return Node.tokenless(type, range)
  }

  public make(value: StringObject, type: Type, options?: Partial<NodeFactoryOptions>): Node
  public make(tokens: MaybeArray<Token>, options?: Partial<NodeFactoryOptions>): Node
  public make(type: Type, range: Range, options?: Partial<NodeFactoryOptions>): Node
  public make(valueOrTokensOrType: StringObject | MaybeArray<Token> | Type, typeOrRangeOrOptions?: Type | Partial<NodeFactoryOptions> | Range, _options?: Partial<NodeFactoryOptions>): Node {
    let node: Node = null as any
    let options: Partial<NodeFactoryOptions> = {}

    // 1. Handle arguments
    if (valueOrTokensOrType instanceof Type) {
      node = this.fromType(valueOrTokensOrType, typeOrRangeOrOptions as Range)

      options = omit(_options ?? {}, `range`)
    } else if (isArray(valueOrTokensOrType) || valueOrTokensOrType instanceof Token) {
      const tokens = isArray(valueOrTokensOrType) ? valueOrTokensOrType : [valueOrTokensOrType]

      node = this.fromToken(tokens[0])
      node.addToken(tokens.slice(1))

      options = (typeOrRangeOrOptions as Partial<NodeFactoryOptions>) ?? {}
    } else {
      node = this.fromString(valueOrTokensOrType, typeOrRangeOrOptions as Type)

      options = _options ?? {}
    }

    assert(node, `Node not created`)

    // 2. Handle options
    if (options.range) node.updateFallbackRange(options.range)
    if (options.type) node.setType(options.type)

    // // 3. Evaluate tokens
    // for (const token of node.tokens) {
    //   if (token.isNonEvaluated) token.evaluate({})
    // }

    evaluateNodeScope(node, { master: this.settings.masterScope })
    node.getScope()

    return node
  }

  public makeByGuess(value: unknown) {
    let node: Node

    // 1. Guess value variable type
    const variableType = guessVariableType(value)

    // 2. Create node
    const type = getNodeType(variableType)
    if (PRIMITIVE_LITERAL_NAMES.includes(type.name as any)) {
      node = this.PRIMITIVE(value, type.name as PrimitiveLiteralName)
    } else if (type.name === `quantity`) {
      const quantity = value as Quantity

      // 1. Create quantity master node
      node = this.QUANTITY(quantity.unit)

      // 2. Add value to quantity
      const quantityValue = this.PRIMITIVE(quantity.value)
      node.children.add(quantityValue, null, { refreshIndexing: false })
    }
    //
    else throw new Error(`Type "${type}" not implemented`)

    // 3. Check token evaluation
    for (const token of node.tokens) {
      if (token.isNonEvaluated) token.evaluate({ fallbackEvaluator: LexemeEvaluateFunction })
    }

    return node
  }

  public ROOT(range: Range): Node {
    return this.make(ROOT, range)
  }

  public NIL(range: Range): Node
  public NIL(node: Node): Node
  public NIL(rangeOrNode: Range | Node): Node {
    let range = rangeOrNode as Range
    if (rangeOrNode instanceof Node) range = Range.fromPoint(rangeOrNode.range.column(`first`))

    return this.make(NIL, range)
  }

  public PRIMITIVE(value: unknown, type?: PrimitiveLiteralName): Node {
    if (type === undefined) {
      const variableType = guessVariableType(value)
      type = getNodeType(variableType).name as PrimitiveLiteralName

      assert(PRIMITIVE_LITERAL_NAMES.includes(type as any), `Type "${type}" is not a primitive literal`)
    }

    const _type = LITERALS_BY_NAME[type]
    const node = this.make(String(value), _type)

    return node
  }

  public OPERATOR(type: OperatorTypeName): Node {
    let string: string = `?`
    if (type === `addition`) string = `+`
    else if (type === `subtraction`) string = `-`
    else throw new Error(`Operator type "${type}" not implemented`)

    const _type = OPERATORS_BY_NAME[type]
    const node = this.make(string, _type)

    return node
  }

  public LIST(range: Range): Node {
    return this.make(LIST, range)
  }

  public STRING_COLLECTION(tokens: Token[]): Node {
    return this.make(tokens, { type: STRING_COLLECTION })
  }

  public SIGN(sign: Token): Node {
    return this.make(sign, { type: SIGN })
  }

  public FUNCTION(name: Node, args: Node, options: Partial<{ range: Range }> = {}): Node {
    // 1. Calculate fallback range
    const fallbackRangeFromNodes = Range.fromOffsetPoints([name.range.column(`first`), args.range.column(`last`)], 0.5)
    const fallbackRange = options.range ?? fallbackRangeFromNodes

    // 2. Create master function node
    const fn = this.make(FUNCTION, fallbackRange)
    fn.setAttributes({ originalNodes: [name.clone(), args.clone()], reorganized: true })

    // 3. Add name node
    name.setAttributes({ tags: [`name`] }).setType(IDENTIFIER)
    fn.children.add(name, null, { refreshIndexing: false })

    // all arguments of a function are its [1, N] children (there is no seed for a parenthesis)
    assert(args.tokens.length === 2, `Unimplemented for enclosure with anything but 2 tokens`) // cause parenthesis has 2 tokens
    assert(args.type.name === `parenthesis`, `Unimplemented for non-parenthesis enclosure`)

    // 4. Properly format () tokens for traversal
    //      #0 is function name
    const [opener, closer] = args.tokens
    opener.attributes.traversalIndex = 1
    closer.attributes.traversalIndex = -1

    fn.addToken([opener, closer])

    // 4. Add argument nodes
    const childIsNotASeparator = args.children.nodes[0].type.id !== `separator`
    const haveMultipleChildrenWithoutWhitespaces = args.children.length > 1 && args.children.nodes.find(node => node.type.name === `whitespace`) === undefined

    const childrenAreArguments = childIsNotASeparator && (haveMultipleChildrenWithoutWhitespaces || args.children.length === 1)

    if (childrenAreArguments)
      while (args.children.length) {
        const child = args.children.nodes[0].setAttributes({ tags: [`argument`] })
        fn.children.add(child, null, { refreshIndexing: false })
      }
    else if (args.children.length > 1) {
      // multiple children, but single argument
      //    make a list
      const argument = this.LIST(Range.fromPoint(args.children.nodes[0].range.column(`first`)))
      argument.setAttributes({ tags: [`argument`] })
      fn.children.add(argument, null, { refreshIndexing: false })

      const grandchildren = [...args.children.nodes]
      for (const grandchild of grandchildren) {
        argument.children.add(grandchild, null, { refreshIndexing: false })
      }
    } else {
      // (parenthesis > child)
      //    child is a separator, ergo its children should be the arguments

      const child = args.children.nodes[0]

      if (child.type.name === `comma`) {
        // inject comma tokens into function node (for printing purposes)
        //    #0  is function name
        //    #1  is (
        //    #-1 is )
        const commas = child.tokens
        for (const [i, comma] of commas.entries()) comma.attributes.traversalIndex = i + 2
        fn.addToken(commas)

        const grandchildren = [...child.children.nodes]
        for (const grandchild of grandchildren) {
          grandchild.setAttributes({ tags: [`argument`] })
          fn.children.add(grandchild, null, { refreshIndexing: false })
        }
      } else throw new Error(`Unsure how to handle a parenthesis with single child "${child.type.getFullName()}"`)
    }

    return fn
  }

  public QUANTITY(unitOfMeasurement: IUnit, options?: Partial<{ unitString: string; wrap: boolean }>): Node
  public QUANTITY(unit: Node, options?: Partial<{ unitString: string; wrap: boolean }>): Node
  public QUANTITY(unitOfMeasurementORUnit: IUnit | Node, options: Partial<{ unitString: string; wrap: boolean }> = {}): Node {
    let unit: Node, unitToken: Token, unitOfMeasurement: IUnit, quantity: Node

    if (isUnit(unitOfMeasurementORUnit)) {
      unitOfMeasurement = unitOfMeasurementORUnit

      // 1. Create unit token
      const _unit = options.unitString ?? unitOfMeasurement.getSymbol()
      unitToken = new Token({ type: `concrete`, value: _unit }, UNIT)

      // 2. Create master quantity node
      quantity = this.make(unitToken, { type: QUANTITY })
    } else {
      unit = unitOfMeasurementORUnit

      // 1. Get unit token from UNIT node
      assert(unit.type.name === `unit`, `Node must be a UNIT type`)
      assert(unit.tokens.length === 1, `Unit node must have exactly ONE token (not ${unit.tokens.length})`)

      unitToken = unit.tokens[0]

      assert(unit.type.name === `unit`, `Token must be a UNIT type`)

      // 2. Convert to master quantity node
      unitOfMeasurement = unitToken.attributes.value as IUnit
      assert(isUnit(unitOfMeasurement), `Unit of measurement is not a valid unit`)

      quantity = unit.setType(QUANTITY)
    }

    // 3. Fix traversal index for unit token (push it to last)
    unitToken.setAttributes({ traversalIndex: -1 })

    // 4. Assign unit of measurement to quantity node
    quantity.setAttributes({ unit: unitOfMeasurement })

    // 5. Wrap in () tokens (for clarity)
    if (options.wrap) {
      const opener = new Token({ type: `concrete`, value: `(` }, STRING)
      const closer = new Token({ type: `concrete`, value: `)` }, STRING)

      opener.setAttributes({ traversalIndex: 0 })
      closer.setAttributes({ traversalIndex: -2 })

      quantity.addToken([opener, closer], 0)
      quantity.setAttributes({ clarityWrapper: true })
    }

    return quantity
  }
}

function guessVariableType(value: unknown): GuessableVariableType {
  let type: GuessableVariableType = typing.getType(value)!
  if (value instanceof Quantity) type = `quantity`

  return type
}

function getNodeType(type: GuessableVariableType): Type {
  if (type === `number`) return NUMBER
  else if (type === `string`) return STRING
  else if (type === `boolean`) return BOOLEAN
  else if (type === `quantity`) return QUANTITY

  throw new Error(`Type "${type}" not implemented`)
}
