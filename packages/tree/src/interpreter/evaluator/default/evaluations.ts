import { get, isNil } from "lodash"
import { MaybeUndefined, Nullable } from "tsdef"
import assert from "assert"

import { Quantity } from "@december/utils/unit"

import { ArtificialToken, Token } from "../../../token/core"
import { BinaryExpression, BooleanLiteral, CallExpression, Expression, ExpressionStatement, Identifier, IfExpression, MemberExpression, Node, NumericLiteral, PrefixExpression, StringLiteral, UnitLiteral } from "../../../tree"

import type Interpreter from "../.."
import { ExpressionValue, FunctionValue, makeRuntimeValue, ObjectValue, RuntimeEvaluation } from "./../../runtime"
import { BooleanValue, NumericValue, QuantityValue, RuntimeValue, StringValue, UnitValue } from "../../runtime"
import Environment, { VARIABLE_NOT_FOUND } from "../../environment"
import { EvaluationFunction, EvaluationOutput } from ".."
import { makeConstantLiteral, makeIdentifier } from "../../../utils/factories"
import { getTokenKind } from "../../../token"
import type Parser from "../../../parser"
import { DefaultExpressionParserProvider } from "../../../parser/grammar/default/parsers/expression"

export const evaluate: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, node: Node, environment: Environment): EvaluationOutput => {
  if (node.type === `BooleanLiteral`) return i.evaluator.call(`evaluateBooleanLiteral`, i, node as BooleanLiteral, environment)
  else if (node.type === `NumericLiteral`) return i.evaluator.call(`evaluateNumericLiteral`, i, node as NumericLiteral, environment)
  else if (node.type === `StringLiteral`) return i.evaluator.call(`evaluateStringLiteral`, i, node as StringLiteral, environment)
  else if (node.type === `UnitLiteral`) return i.evaluator.call(`evaluateUnitLiteral`, i, node as StringLiteral, environment)
  else if (node.type === `Identifier`) return i.evaluator.call(`evaluateIdentifier`, i, node as Identifier, environment)
  else if (node.type === `PrefixExpression`) return i.evaluator.call(`evaluatePrefixExpression`, i, node as PrefixExpression, environment)
  else if (node.type === `BinaryExpression`) return i.evaluator.call(`evaluateBinaryExpression`, i, node as BinaryExpression, environment)
  else if (node.type === `CallExpression`) return i.evaluator.call(`evaluateCallExpression`, i, node as CallExpression, environment)
  else if (node.type === `MemberExpression`) return i.evaluator.call(`evaluateMemberExpression`, i, node as MemberExpression, environment)
  else if (node.type === `IfExpression`) return i.evaluator.call(`evaluateIfExpression`, i, node as IfExpression, environment)
  //
  else if (node.type === `ExpressionStatement`) return i.evaluator.call(`evaluateExpressionStatement`, i, node as ExpressionStatement, environment)
  //
  else throw new Error(`Node type not implemented for interpretation/evaluation: ${node.type}`)
}

export const evaluateExpressionStatement: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, expressionStatement: ExpressionStatement, environment: Environment): EvaluationOutput => {
  return i.evaluator.evaluate(i, expressionStatement.expression, environment)
}

export const evaluatePrefixExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, prefixExpression: PrefixExpression, environment: Environment): RuntimeEvaluation => {
  const operator = prefixExpression.operator.content

  const right = i.evaluator.evaluate(i, prefixExpression.right, environment)
  if (!RuntimeEvaluation.isResolved(right)) return new RuntimeEvaluation(new PrefixExpression(prefixExpression.operator, right.toNode(i)))

  assert([`-`, `+`].includes(operator), `Operator not implemented: ${operator}`)
  assert(right.runtimeValue.hasNumericRepresentation(), `Right value must be a numeric value (or at least have a numeric representation)`)

  const modifier = operator === `-` ? -1 : 1
  const result: number = right.runtimeValue.asNumber() * modifier

  return new NumericValue(result).getEvaluation(prefixExpression)

  // throw new Error(`PrefixExpression (${operator}) not implemented for type "${right.runtimeValue.type}"`)
}

export const evaluateBinaryExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, binaryExpression: BinaryExpression, environment: Environment): RuntimeEvaluation => {
  const operator = binaryExpression.operator.content

  const isAlgebraic = [`+`, `-`, `*`, `/`, `^`].includes(operator)
  const isLogical = [`=`, `!=`, `>`, `<`, `>=`, `<=`].includes(operator)
  const isLogicalConnective = [`|`, `&`].includes(operator)

  // if (binaryExpression.left.getContent() === `thr`) debugger

  const left = i.evaluator.evaluate(i, binaryExpression.left, environment)
  const right = i.evaluator.evaluate(i, binaryExpression.right, environment)

  // throw new Error(`Both sides of the BinaryExpression must be evaluated before the BinaryExpression itself can be evaluated.`)
  if (!RuntimeEvaluation.isResolved(left) || !RuntimeEvaluation.isResolved(right)) {
    if (isLogicalConnective && (RuntimeEvaluation.isResolved(left) || !RuntimeEvaluation.isResolved(right))) {
      // EXCEPTION: Logical connectives can be evaluated without both sides being resolved (in some cases)
      debugger // TODO: this
    }

    return new RuntimeEvaluation(new BinaryExpression(left.toNode(i), binaryExpression.operator, right.toNode(i)))
  }

  let output: EvaluationOutput = undefined

  if (isLogical) return logicalBinaryOperation(left.runtimeValue, right.runtimeValue, operator).getEvaluation(binaryExpression)
  else if (isLogicalConnective) return logicalConnectiveBinaryOperation(left.runtimeValue, right.runtimeValue, operator).getEvaluation(binaryExpression)
  else if (isAlgebraic) {
    if (left.runtimeValue.hasNumericRepresentation()) {
      // ???
      if (StringValue.isStringValue(right.runtimeValue)) debugger

      // 1. Simple algebra with numbers
      if (right.runtimeValue.hasNumericRepresentation()) return numericAlgebraicOperation(left.runtimeValue, right.runtimeValue, operator).getEvaluation(binaryExpression)

      // 2. Try number x unknown algebraic operation (injectable)
      if (output === undefined) output = i.evaluator.call(`evaluateNumericAndOtherAlgebraicOperation`, left.runtimeValue, right.runtimeValue, operator)
    }
  }

  // 3. No clue about types, asks for custom (injectable) operations
  if (!output) output = i.evaluator.call(`evaluateCustomOperation`, left.runtimeValue, right.runtimeValue, operator, binaryExpression)

  // 4. Any time during the process a output could have been decided. If there is any, return it. If there is an UNRESOLVED output, send updated expression back
  if (output) {
    if (RuntimeValue.isRuntimeValue(output)) return output.getEvaluation(binaryExpression)
    if (RuntimeEvaluation.isResolved(output)) return output

    // throw new Error(`Both sides of the BinaryExpression must be evaluated before the BinaryExpression itself can be evaluated.`)
    const leftNode = left.toNode(i)
    const rightNode = right.toNode(i)
    return new RuntimeEvaluation(new BinaryExpression(leftNode, binaryExpression.operator, rightNode))
  }

  // 5. If operation is not possible (probably due to type mismatch), bail out
  if (isAlgebraic) {
    //    5.A. number + non-numeric OBJECT
    if (left.runtimeValue.hasNumericRepresentation() && !right.runtimeValue.hasNumericRepresentation() && right.runtimeValue.type === `object`) {
      const objectNode = right.toNode(i)
      return new RuntimeEvaluation(new BinaryExpression(left.toNode(i), binaryExpression.operator, objectNode))
    } else if (right.runtimeValue.hasNumericRepresentation() && !left.runtimeValue.hasNumericRepresentation() && left.runtimeValue.type === `object`) {
      const objectNode = left.toNode(i)
      return new RuntimeEvaluation(new BinaryExpression(objectNode, binaryExpression.operator, left.toNode(i)))
    }
    //    5.B. non-numeric OBJECT + non-numeric OBJECT
    else if (!left.runtimeValue.hasNumericRepresentation() && left.runtimeValue.type === `object` && !right.runtimeValue.hasNumericRepresentation() && right.runtimeValue.type === `object`) {
      const leftNode = left.toNode(i)
      const rightNode = right.toNode(i)
      return new RuntimeEvaluation(new BinaryExpression(leftNode, binaryExpression.operator, rightNode))
    }
  }

  throw new Error(`BinaryExpression not implemented for types: "${left.runtimeValue.type}" and "${right.runtimeValue.type}"`)
}

export const evaluateIdentifier: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, identifier: Identifier, environment: Environment): RuntimeEvaluation => {
  const variableName = identifier.getVariableName()
  return getValueFromEnvironment(i, environment, variableName, identifier)
}

export const evaluateCallExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, callExpression: CallExpression, environment: Environment): RuntimeEvaluation => {
  const callee = callExpression.callee.getContent()

  // if (global.__CALL_QUEUE_CONTEXT_OBJECT.id === `11270`) debugger

  // 0. Check if call is a valid function, if now we should transform it in a regular StringExpression
  //     for example, AD:Claws (Blunt) is not a function, but @basethdice(...) is (in GCA terms)
  if (!i.isValidFunctionName(callee)) {
    const stringLiteral = new StringLiteral()
    stringLiteral.tokens.push(...callExpression.callee.tokens)
    // debugger // TODO: How do I detect if there were a WHITESPACE here?
    stringLiteral.tokens.push(new ArtificialToken(getTokenKind(`open_parenthesis`), `(`))
    stringLiteral.tokens.push(...callExpression.arguments.flatMap(arg => arg.tokens))
    stringLiteral.tokens.push(new ArtificialToken(getTokenKind(`close_parenthesis`), `)`))

    const parser: Parser<DefaultExpressionParserProvider> = i.parser
    const expression: Expression = parser.grammar.call(`parseStringExpression`)(parser, stringLiteral, null as any)

    return i.evaluator.evaluate(i, expression, environment)
  }

  // always index symbol, regardless of it being found or not
  //    (should we index CALL_EXPRESSION or CALL_EXPRESSION.CALLEE?)
  i.indexNodeAsSymbol(callExpression)

  const args = callExpression.arguments.map(argument => i.evaluator.evaluate(i, argument, environment))

  // 1. If some argument could not be evaluated bail out
  if (args.some(arg => !RuntimeEvaluation.isResolved(arg))) {
    const nodeArguments = args.map(arg => arg.toNode(i))
    return new RuntimeEvaluation(new CallExpression(callExpression.callee, nodeArguments))
  }

  // 2. If callee function implementation is missing, bail out
  const resolvedFunctionName = environment.resolve(callee)
  const isPresent = !!resolvedFunctionName && !!resolvedFunctionName.environment

  if (!isPresent) {
    if (!resolvedFunctionName) return new RuntimeEvaluation(callExpression)
    else if (resolvedFunctionName.variableName === callee) return new RuntimeEvaluation(callExpression)
    else {
      const calleeNode = makeConstantLiteral(resolvedFunctionName.variableName)
      const nodeArguments = args.map(arg => arg.toNode(i))
      return new RuntimeEvaluation(new CallExpression(calleeNode, nodeArguments))
    }
  }

  // X. Call function
  //      (first parse args to values)
  const argumentValues = args.map(arg => arg.runtimeValue)
  if (argumentValues.some(arg => !RuntimeValue.isRuntimeValue(arg))) {
    debugger
  }

  const fn = resolvedFunctionName.environment!.getValue(resolvedFunctionName.variableName)!
  assert(FunctionValue.isFunctionValue(fn), `Callee does not correspond to a function in environment.`)

  const returnedValue = fn.value(i, callExpression, environment)(...argumentValues)

  // 3. Function could not return a value, bail out
  if (returnedValue === null) return new RuntimeEvaluation(callExpression)

  // 4. Function returned a NODE, evalute it
  if (Node.isNode(returnedValue)) return i.evaluator.evaluate(i, returnedValue, environment)

  // 5. Function returned a RUNTIME_VALUE, nice, just pack it with expression
  if (RuntimeValue.isRuntimeValue(returnedValue)) return returnedValue.getEvaluation(callExpression)

  // 6. Function returned EXACTLY a RUNTIME_EVALUATION, nice, just return it
  if (RuntimeEvaluation.isRuntimeEvaluation(returnedValue)) return returnedValue

  throw new Error(`CallExpression evalution should return an evaluation`)
}

export const evaluateMemberExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, memberExpression: MemberExpression, environment: Environment): RuntimeEvaluation => {
  // always index symbol, regardless of it being found or not
  //    (actually indexing root object->property1->property2)
  if (memberExpression.parent?.type !== `MemberExpression`) i.indexNodeAsSymbol(memberExpression)

  const object = i.evaluator.evaluate(i, memberExpression.object, environment)

  // 1. If object could not be evaluated bail out
  if (!RuntimeEvaluation.isResolved(object)) return new RuntimeEvaluation(memberExpression)
  assert(ObjectValue.isObjectValue(object.runtimeValue), `Object must be an ObjectValue`)

  const property = i.evaluator.evaluate(i, memberExpression.property, environment)

  // 1. If object could not be evaluated bail out
  if (!RuntimeEvaluation.isResolved(property)) return new RuntimeEvaluation(memberExpression)

  // 2. Get property name from expression
  let propertyName: string | number = ``
  if (StringValue.isStringValue(property.runtimeValue)) propertyName = property.runtimeValue.value
  else if (NumericValue.isNumericValue(property.runtimeValue)) {
    if (object.runtimeValue.isArray()) propertyName = property.runtimeValue.asNumber()
    else throw new Error(`Unimplemented for non-array objects + numeric path`)
  }
  //
  else throw new Error(`Unimplemented for non-string or non-number property names`)

  // 3. If property could not be found, bail out
  const content = memberExpression.getContent()
  if (![`level`, `base`].includes(propertyName as any) && !content.endsWith(`score->base->value`) && !content.endsWith(`score->value`)) assert(object.runtimeValue.hasProperty(propertyName), `Property "${propertyName}" not found in object.`)
  if (!object.runtimeValue.hasProperty(propertyName)) return new RuntimeEvaluation(memberExpression)

  // 4. Get property value from object
  const propertyValue = object.runtimeValue.getProperty(propertyName)

  const runtimePropertyValue = makeRuntimeValue(propertyValue)
  return runtimePropertyValue.getEvaluation(memberExpression)
}

export const evaluateIfExpression: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, ifExpression: IfExpression, environment: Environment): RuntimeEvaluation => {
  const condition = i.evaluator.evaluate(i, ifExpression.condition, environment)

  if (!RuntimeEvaluation.isResolved(condition)) {
    // return new RuntimeEvaluation(new IfExpression(condition.toNode(i), ifExpression.consequent, ifExpression.alternative))

    // TODO: Probably dont evaluate consequent/alternative here, for now its just for testing and debugging
    const consequent = i.evaluator.evaluate(i, ifExpression.consequent, environment)
    const alternative = ifExpression.alternative ? i.evaluator.evaluate(i, ifExpression.alternative, environment) : undefined

    return new RuntimeEvaluation(new IfExpression(condition.toNode(i), consequent.toNode(i), alternative ? alternative.toNode(i) : undefined))
  }

  let result: Nullable<boolean> = null

  if (BooleanValue.isBooleanValue(condition.runtimeValue)) result = condition.runtimeValue.value
  else if (NumericValue.isNumericValue(condition.runtimeValue)) result = condition.runtimeValue.value !== 0
  else if (StringValue.isStringValue(condition.runtimeValue)) debugger
  else if (ObjectValue.isObjectValue(condition.runtimeValue)) {
    if (condition.runtimeValue.hasBooleanRepresentation()) result = condition.runtimeValue.asBoolean()
  }

  assert(result !== null, `Result cannot be null (i.e. we could not determine the boolean outcome of condition).`)

  if (result) return i.evaluator.evaluate(i, ifExpression.consequent, environment)
  else {
    // assert(ifExpression.alternative, `Alternative expression must be present if condition is false`)
    if (ifExpression.alternative === undefined) return new BooleanValue(false).getEvaluation(ifExpression)

    return i.evaluator.evaluate(i, ifExpression.alternative, environment)
  }
}

// "PRIMITIVES"
//    Evaluations that ALWAYS return a runtime value

export const evaluateBooleanLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, booleanLiteral: BooleanLiteral, environment: Environment): RuntimeEvaluation<BooleanValue> =>
  new BooleanValue(booleanLiteral.getValue()).getEvaluation(booleanLiteral)
export const evaluateNumericLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, numericLiteral: NumericLiteral, environment: Environment): RuntimeEvaluation<NumericValue> =>
  new NumericValue(numericLiteral.getValue()).getEvaluation(numericLiteral)
export const evaluateStringLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, stringLiteral: StringLiteral, environment: Environment): RuntimeEvaluation<StringValue> =>
  new StringValue(String(stringLiteral.getValue())).getEvaluation(stringLiteral)
export const evaluateUnitLiteral: EvaluationFunction = (i: Interpreter<DefaultEvaluationsProvider>, unitLiteral: UnitLiteral, environment: Environment): RuntimeEvaluation<UnitValue> =>
  new UnitValue(unitLiteral.unit).getEvaluation(unitLiteral)

// "INJECTABLES"
//    Evaluation positioned for easy override
export const evaluateNumericAndOtherAlgebraicOperation = (left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string): MaybeUndefined<RuntimeValue<any>> => {
  if (right.type === `unit` && operator === `*`) {
    const quantity = new Quantity(left.asNumber(), right.value)
    return new QuantityValue(quantity)
  }

  return undefined
}

export const evaluateCustomOperation = (left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string, node: Node): EvaluationOutput => {
  // Not implemented by default
  // Custom protocols should override this function

  return undefined
}

export const DEFAULT_EVALUATIONS = {
  evaluate,
  //
  evaluateExpressionStatement,
  //
  evaluatePrefixExpression,
  evaluateBinaryExpression,
  evaluateIdentifier,
  evaluateCallExpression,
  evaluateMemberExpression,
  evaluateIfExpression,
  evaluateBooleanLiteral,
  evaluateNumericLiteral,
  evaluateStringLiteral,
  evaluateUnitLiteral,
  //
  evaluateNumericAndOtherAlgebraicOperation,
  evaluateCustomOperation,
}
export type DefaultEvaluationsProvider = typeof DEFAULT_EVALUATIONS

// #region UTILS

function numericAlgebraicOperation(left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string): NumericValue {
  let result: Nullable<number> = null

  if (operator === `+`) result = left.asNumber() + right.asNumber()
  else if (operator === `-`) result = left.asNumber() - right.asNumber()
  else if (operator === `*`) result = left.asNumber() * right.asNumber()
  else if (operator === `/`) result = left.asNumber() / right.asNumber()
  else if (operator === `^`) result = left.asNumber() ** right.asNumber()
  //
  else throw new Error(`Operator not implemented: ${operator}`)

  assert(result !== null, `Result cannot be null.`)

  return new NumericValue(result)
}

function logicalBinaryOperation(left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string): BooleanValue {
  let result: Nullable<boolean> = null

  if (operator === `=`) result = left.value == right.value
  else if (operator === `!=`) result = left.value != right.value
  else if (operator === `>`) result = left.value > right.value
  else if (operator === `<`) result = left.value < right.value
  else if (operator === `>=`) result = left.value >= right.value
  else if (operator === `<=`) result = left.value <= right.value
  //
  else throw new Error(`Operator not implemented: ${operator}`)

  assert(result !== null, `Result cannot be null.`)

  return new BooleanValue(result)
}

function logicalConnectiveBinaryOperation(left: RuntimeValue<any>, right: RuntimeValue<any>, operator: string): BooleanValue {
  let result: Nullable<boolean> = null

  assert(left.hasBooleanRepresentation(), `Left value must be a boolean value OR have a boolean representation`)
  assert(right.hasBooleanRepresentation(), `Right value must be a boolean value OR have a boolean representation`)

  if (operator === `|`) result = left.asBoolean() || right.asBoolean()
  else if (operator === `&`) result = left.asBoolean() && right.asBoolean()
  //
  else throw new Error(`Operator not implemented: ${operator}`)

  assert(result !== null, `Result cannot be null.`)

  return new BooleanValue(result)
}

function getValueFromEnvironment(i: Interpreter, environment: Environment, variableName: string, node: Node): RuntimeEvaluation {
  i.indexNodeAsSymbol(node) // always index symbol, regardless of it being found or not

  const resolvedVariable = environment.resolve(variableName)
  const isPresent = !!resolvedVariable && !!resolvedVariable.environment

  if (!isPresent) {
    if (!resolvedVariable) return new RuntimeEvaluation(node)
    else if (resolvedVariable.variableName === variableName) return new RuntimeEvaluation(node)
    else return new RuntimeEvaluation(makeIdentifier(resolvedVariable.variableName))
  }

  const value = resolvedVariable.environment!.getValue(resolvedVariable.variableName)!
  assert(RuntimeValue.isRuntimeValue(value), `Value must be a RuntimeValue`)

  // Evaluate expression value
  if (ExpressionValue.isExpressionValue(value)) {
    const evaluatedValue = i.evaluator.evaluate(i, value.value, environment)
    assert(RuntimeEvaluation.isRuntimeEvaluation(evaluatedValue), `Expected RuntimeEvaluation`)

    return evaluatedValue
  }

  return value.getEvaluation(node)
}

// #endregion
