import assert from "assert"
import { MaybeArray } from "tsdef"
import { isArray, isString, omit } from "lodash"

import { Range, typing } from "@december/utils"
import { isUnit, IUnit, Quantity } from "@december/utils/unit"

import Node from "."
import Token from "../token"
import { ConcreteString, ProvidedString } from "../string"

import Type from "../type/base"
import { BOOLEAN, NIL, NUMBER, QUANTITY, STRING, UNIT, PRIMITIVE_LITERALS, PrimitiveLiteral, PRIMITIVE_LITERAL_NAMES } from "../type/declarations/literal"
import { FUNCTION, LIST } from "../type/declarations/enclosure"
import { ROOT } from "../type/declarations/structural"
import { STRING_COLLECTION } from "./../type/declarations/literal"
import { SIGN } from "../type/declarations/operator"

type StringObject = ProvidedString | ConcreteString | string
type GuessableVariableType = typing.VariableType | `quantity`

export interface NodeFactoryOptions {
  range: Range
  type: Type
}

export default class NodeFactory {
  private static fromString(value: StringObject, type: Type): Node {
    const string: ProvidedString | ConcreteString = isString(value) ? { type: `concrete`, value } : value

    const token = new Token(string, type)

    return this.fromToken(token)
  }

  private static fromToken(token: Token): Node {
    return new Node(token)
  }

  private static fromType(type: Type, range: Range): Node {
    return Node.tokenless(type, range)
  }

  public static make(value: StringObject, type: Type, options?: Partial<NodeFactoryOptions>): Node
  public static make(tokens: MaybeArray<Token>, options?: Partial<NodeFactoryOptions>): Node
  public static make(type: Type, range: Range, options?: Partial<NodeFactoryOptions>): Node
  public static make(valueOrTokensOrType: StringObject | MaybeArray<Token> | Type, typeOrRangeOrOptions?: Type | Partial<NodeFactoryOptions> | Range, _options?: Partial<NodeFactoryOptions>): Node {
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

    return node
  }

  public static makeByGuess(value: unknown) {
    let node: Node

    // 1. Guess value variable type
    const variableType = guessVariableType(value)

    // 2. Create node
    const type = getNodeType(variableType)
    if (PRIMITIVE_LITERAL_NAMES.includes(type.name as any)) {
      node = NodeFactory.PRIMITIVE(value, type as PrimitiveLiteral)
    } else if (type.name === `quantity`) {
      const quantity = value as Quantity

      // 1. Create quantity master node
      node = NodeFactory.QUANTITY(quantity.unit)

      // 2. Add value to quantity
      const quantityValue = NodeFactory.PRIMITIVE(quantity.value)
      node.children.add(quantityValue, null, { refreshIndexing: false })
    }
    //
    else throw new Error(`Type "${type}" not implemented`)

    // 3. Check token evaluation
    for (const token of node.tokens) {
      if (token.isNonEvaluated) token.evaluate({})
    }

    return node
  }

  public static ROOT(range: Range): Node {
    return NodeFactory.make(ROOT, range)
  }

  static NIL(range: Range): Node
  static NIL(node: Node): Node
  static NIL(rangeOrNode: Range | Node): Node {
    let range = rangeOrNode as Range
    if (rangeOrNode instanceof Node) range = Range.fromPoint(rangeOrNode.range.column(`first`))

    return NodeFactory.make(NIL, range)
  }

  static PRIMITIVE(value: unknown, type?: PrimitiveLiteral): Node {
    if (type === undefined) {
      const variableType = guessVariableType(value)
      type = getNodeType(variableType)

      assert(PRIMITIVE_LITERAL_NAMES.includes(type.name as any), `Type "${type}" is not a primitive literal`)
    }

    const node = NodeFactory.make(String(value), type!)

    return node
  }

  static LIST(range: Range): Node {
    return NodeFactory.make(LIST, range)
  }

  static STRING_COLLECTION(tokens: Token[]): Node {
    return NodeFactory.make(tokens, { type: STRING_COLLECTION })
  }

  static SIGN(sign: Token): Node {
    return NodeFactory.make(sign, { type: SIGN })
  }

  static FUNCTION(range: Range): Node {
    const fn = NodeFactory.make(FUNCTION, range)

    return fn
  }

  static QUANTITY(unitOfMeasurement: IUnit, options?: Partial<{ unitString: string; wrap: boolean }>): Node
  static QUANTITY(unit: Node, options?: Partial<{ unitString: string; wrap: boolean }>): Node
  static QUANTITY(unitOfMeasurementORUnit: IUnit | Node, options: Partial<{ unitString: string; wrap: boolean }> = {}): Node {
    let unit: Node, unitToken: Token, unitOfMeasurement: IUnit, quantity: Node

    if (isUnit(unitOfMeasurementORUnit)) {
      unitOfMeasurement = unitOfMeasurementORUnit

      // 1. Create unit token
      const _unit = options.unitString ?? unitOfMeasurement.getSymbol()
      unitToken = new Token({ type: `concrete`, value: _unit }, UNIT)

      // 2. Create master quantity node
      quantity = NodeFactory.make(unitToken, { type: QUANTITY })
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
