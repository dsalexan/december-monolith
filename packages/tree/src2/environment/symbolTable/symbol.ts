import { AnyObject, MaybeUndefined, Nilable } from "tsdef"
import assert from "assert"
import { isString } from "lodash"

import { MasterScope } from "../../node/scope"
import Node from "../../node"
import { explainSymbol, SimbolExplainOptions } from "./explain"
import { Block } from "../../logger"
import { ObjectSource } from "../source"

export type SymbolKey = Simbol[`key`]

export interface SymbolFromNodeOptions {
  scope: MasterScope
}

export default class Simbol {
  public key: string

  constructor(key: string) {
    this.key = key
  }

  /** Check if node is eligible as a symbol */
  static isNodeEligible(node: Node, { scope: masterScope }: SymbolFromNodeOptions): boolean {
    const isNil = node.type.name === `nil`
    const isIdentifier = node.type.id === `identifier`
    const isNonNumericLiteral = node.type.isLiteralLike() && ![`number`, `sign`].includes(node.type.name) && !isNil
    const isOperand = node.type.modules.includes(`operand`)

    // 1. Check if node is a valid symbol
    let isSymbol = false
    if (masterScope === `math-enabled`) {
      isSymbol = isIdentifier || isNonNumericLiteral
    } else throw new Error(`Unimplemented master scope "${masterScope}"`)

    return isSymbol
  }

  /** Instantiates a new symbol from node information (usually node's content) */
  static fromNode(node: Node, { scope: masterScope }: SymbolFromNodeOptions): MaybeUndefined<Simbol> {
    if (!Simbol.isNodeEligible(node, { scope: masterScope })) return undefined

    // 1. Determine key
    const content = node.content as string
    assert(isString(content), `Non-string content`)

    let value: string = node.content as string
    if (node.attributes.tags.includes(`from-quotes`)) value = content.slice(1, -1)

    const key = value.trim()

    return new Simbol(key)
  }

  /** Inject symbol value into environment (tecnically into a object source that will be added to environment) */
  public static injectValueIntoObjectSource(key: SymbolKey, objectSource: ObjectSource, getValue: SymbolValueInvoker): boolean {
    // MAKE SURE ENVIRONMENT DOESNT ALREADY HAVE THIS SYMBOL

    /**
     * SYMBOL VALUE INVOKER -> returns value for symbol
     *    value -> symbol reference found (be it a "real" value or UndefinedValue or NullValue)
     *    undefined -> symbol reference not found
     */

    const _value = getValue(key)
    if (_value === undefined) return false

    const value = _value === UndefinedValue ? undefined : _value === NullValue ? null : _value

    // Set value in object source
    objectSource.addKeyEntry({ name: key, value: { type: `simple`, value } }, key)

    return true
  }

  /** Prints symbol information */
  public explain(options: SimbolExplainOptions = {}): Block[] {
    return explainSymbol(this, options)
  }
}

export const UndefinedValue = Symbol.for(`symbol:undefiend`)
export const NullValue = Symbol.for(`symbol:undefiend`)
export type SymbolValueInvoker = (symbolKey: SymbolKey) => MaybeUndefined<AnyObject | typeof UndefinedValue | typeof NullValue>
