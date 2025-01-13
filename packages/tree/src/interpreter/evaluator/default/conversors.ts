import { assert } from "console"
import { isNumber } from "lodash"

import type Interpreter from "../.."

import { ArtificialToken, getTokenKind } from "../../../token"

import { BinaryExpression, BooleanLiteral, Identifier, MemberExpression, Node, NumericLiteral, StringLiteral, UnitLiteral } from "../../../tree"
import { BooleanValue, ExpressionValue, NumericValue, ObjectValue, PropertyValue, QuantityValue, RuntimeValue, StringValue, UnitValue } from "../../runtime"
import { NodeConversionFunction } from ".."
import { Nullable } from "tsdef"

export const convertToNode: NodeConversionFunction<Node, RuntimeValue<any>> = (i: Interpreter<DefaultNodeConversionProvider>, value: RuntimeValue<any>, sourceNode: Nullable<Node>): Node => {
  if (BooleanValue.isBooleanValue(value)) return new BooleanLiteral(value.value)
  if (NumericValue.isNumericValue(value)) return new NumericLiteral(new ArtificialToken(getTokenKind(`number`), String(value.value)))
  if (StringValue.isStringValue(value)) return new StringLiteral(new ArtificialToken(getTokenKind(`string`), value.value))
  if (UnitValue.isUnitValue(value)) return new UnitLiteral(value.value, new ArtificialToken(getTokenKind(`string`), value.value.symbol))
  if (QuantityValue.isQuantityValue(value)) {
    // assert(isNumber(value.value.value), `Quantity value must be a number.`)
    const numericValue = value.value.value as number
    assert(isNumber(numericValue), `Quantity value must be a number.`)

    const ASTERISK = new ArtificialToken(getTokenKind(`asterisk`), `*`)

    const numericLeft = i.evaluator.convertToNode<NumericLiteral>(i, new NumericValue(numericValue), null)
    const unitRight = i.evaluator.convertToNode<UnitLiteral>(i, new UnitValue(value.value.unit), null)

    return new BinaryExpression(numericLeft, ASTERISK, unitRight)
  }
  if (ObjectValue.isObjectValue(value)) {
    if (value.hasNumericRepresentation()) return new NumericLiteral(new ArtificialToken(getTokenKind(`number`), String(value.asNumber())))
    if (sourceNode) return sourceNode

    throw new Error(`Cannot parse runtime value to expression string: ${value.type}`)
  }
  if (ExpressionValue.isExpressionValue(value)) return value.value
  if (PropertyValue.isPropertyValue(value)) {
    const OBJECT = new Identifier(new ArtificialToken(getTokenKind(`string`), value.value.objectVariableName))

    // check any re-typing rules from grammar (usually for identifiers)
    const propertyToken = new ArtificialToken(getTokenKind(`string`), value.value.propertyName)

    let PROPERTY: Node = new StringLiteral(propertyToken)

    const transformedNode = i.parser.grammar.shouldTransformNode(PROPERTY)
    if (transformedNode) PROPERTY = transformedNode

    return new MemberExpression(OBJECT, PROPERTY)
  }

  throw new Error(`Cannot parse runtime value to expression string: ${value.type}`)
}

export const DEFAULT_NODE_CONVERSORS = { convertToNode }
export type DefaultNodeConversionProvider = typeof DEFAULT_NODE_CONVERSORS
