import { get, has, set } from "lodash"
import { z, ZodType } from "zod"

import { typing } from "@december/utils"

import { Parity, ParityKey, ParitySignature } from "../parity"
import { CompilationManager, Reaction, ReactiveCompilationManager } from "../.."

import { EventTrigger, ReactionTrigger, ExplicitReactionTrigger } from "../reaction/triggers"
import { ParallelReaction } from "../reaction"
import { ReactionInstruction } from "../reaction/definition"
import { ExplicitPropertyReference, ReactionDefinitionReference, StrictObjectReference } from "../../reference"
import { ComputedObject, ComputedValueObjectAdapter, ScopeSymbolMap } from "./object"

/**
 * A Computed Value is a object that holds essential information to access, compile and update a dynamic value
 */

export type SerializedComputedValue<TValue> = {
  _key: string
  _expression: string
  _isReady: boolean
  _value?: TValue
}
// export type ComputedValue<TValue> = z.infer<ReturnType<typeof ComputedValueSchema<ZodType<TValue>>>>

export class ComputedValue<TValue, TScopeGenerator extends (...args: any[]) => object> implements typing.ITyped {
  __type: { ComputedValue: true } = { ComputedValue: true }

  private _key: string
  private _meta: object = {} // metadata that needs to be attached to the object
  //
  private _expression: string
  private _parity: Parity
  private _object: ComputedObject<TScopeGenerator, TValue>
  //
  private _timestamp: Date | undefined
  private _value: TValue | undefined

  symbols: ScopeSymbolMap = {} // base symbols that are missing in the scope

  // encapsulate shit
  get key() {
    return this._key
  }

  get meta() {
    return {
      get: (key: string) => this._meta[key],
      set: (key: string, value: unknown) => (this._meta[key] = value),
      length: () => Object.keys(this._meta),
    }
  }

  get expression() {
    return this._expression
  }

  get parity() {
    return this._parity
  }

  get object() {
    return this._object
  }

  constructor(key: string, parity?: Parity) {
    this._key = key

    // this._expression = expression
    //    Expression is never set on construction because it needs a data object to store parity data
    //    To assign an expression use the .update(...) method
    this._parity = parity ?? new Parity(key)
    // this is the parity object for pragmatic reasons, BUT THE HASHES ARE NEVER CHECKED AGAINST IT
    //    this is here only for injection in data
    //    after it is injected, it behaves more like a ParitySignature

    this.reset()
  }

  static isComputedValue<TValue, TScopeGenerator extends (...args: any[]) => object = (...args: any[]) => object>(value: unknown): value is ComputedValue<TValue, TScopeGenerator> {
    return !typing.isPrimitive(value) && has(value, `_key`) && has(value, `_expression`) && has(value, `_timestamp`) && has(value, `_value`)
  }

  static make<TValue, TScopeGenerator extends (...args: any[]) => object = (...args: any[]) => object>(key: string, parity?: Parity) {
    const computedValue = new ComputedValue<TValue, TScopeGenerator>(key, parity)

    return computedValue
  }

  /** Returns if a computed value was computed at least once */
  get isReady() {
    return this._timestamp !== undefined
  }

  static get(possibleComputedValue: unknown) {
    if (ComputedValue.isComputedValue(possibleComputedValue)) return possibleComputedValue._value
    return possibleComputedValue
  }

  get() {
    if (!this.isReady) {
      debugger
      throw new Error(`Value is not computed`)
    }

    return this._value
  }

  /**
   * Updates expression and deal with keeping parity
   * @param newExpression New expression string
   * @param data Data object to host parity information
   * @returns
   */
  update(newExpression: string, data: object) {
    // both expressions are the same, no need to update
    if (newExpression === this._expression) return false

    // update expression and reset computed state
    this._expression = newExpression
    this.reset()

    // represh parity hash, since expression changed
    this._parity.refresh()
    this._parity.inject(data)
  }

  /** Reset computed state */
  reset() {
    this._timestamp = undefined
    this._value = undefined
  }

  /** Prepare for computation by creating a computedObject based on external implementation */
  prepare(adapter: ComputedValueObjectAdapter<TScopeGenerator, TValue>, meta: object) {
    // TODO: Refactor this mode thing. It is not really something from computed, but it is something in GURPS and for tree parser/interpreter
    const object = adapter(this, this.symbols, meta)

    this._object = object
  }

  /** Access computed object and computes new value */
  compute(scope: Parameters<TScopeGenerator>) {
    const object = this._object

    const value = object.compute(scope)

    // update value and timestamp
    this._timestamp = new Date()
    this._value = value
  }

  /** Build a list of reaction instructions to be executed when expression changes */
  instructions(parent: StrictObjectReference, target: StrictObjectReference, definition: ReactionDefinitionReference<StrictObjectReference>): ReactionInstruction[] {
    // Whenever the _expression in computed value changes, we should "unfold" computed value
    //    "unfold" is recreate the computedObject
    //        it can also change parity hash, if it detects a differente _expression than what is stored

    //  I don't add a parity to instruction since it it a "once" policy, the instruction should be removed after running anyway (and if the parity can only change if _expression changes, and if _expression changes the "ComputedValue Expression Changed" fn is called anyway)
    const instruction = new ReactionInstruction(`${this.key}:once`, { object: parent, strategy: `local` }) // ,this.parity.signature())
    instruction.triggers.add(
      {
        type: `event`,
        policy: `once`,
        name: `stack:compile:done`, // trick to run instruction once the compilation is done (since the computed value would be first updated BEFORE the instruction ever made into the object proper, so it would not capture the change in the computed value's path)
      },
      // this dynamic trigger is not really necessary if I just add the regex path to the reaction watchlist
      // {
      //   type: `property`,
      //   policy: `always`,
      //   property: { object: self, path: `${this.key}.${`_expression`}` }, // run reaction everytime the expression changes (parity is only used to removed outdated instructions)
      // },
    )
    instruction.definition.set(definition)
    instruction.target.set(target)
    instruction.context.set(`computedValueKey`, this.key)

    return [instruction]
  }

  serialize(): SerializedComputedValue<TValue> {
    const serialized: SerializedComputedValue<TValue> = {
      _key: this._key,
      _expression: this._expression,
      _isReady: this.isReady,
    }

    // only inject _value if computed value was computed at least once, otherelse there is no need to clutter the object
    if (serialized._isReady) serialized._value = this._value

    return serialized
  }

  static unserialize<TValue>(serialized: SerializedComputedValue<TValue>, data: object) {
    const computedValue = ComputedValue.make<TValue>(serialized._key)
    computedValue.update(serialized._expression, data)

    // TODO: Is it necessary? Shouldn't we re compute the value?
    if (serialized._isReady) {
      computedValue._timestamp = new Date()
      computedValue._value = serialized._value
    }

    return computedValue
  }
}

// export const ComputedValueSchema = <TValueSchema extends ZodType>(valueSchema: TValueSchema) =>
//   z.object({
//     _key: z.string(), // key to computed object (usually stored in object.data._.computed[key])
//     _expression: z.string(), // string expression
//     _timestamp: z.date().or(z.undefined()), // date of last computation
//     _value: valueSchema,
//   })

export const ComputedValueSchema = <TValueSchema extends ZodType, TScopeGenerator extends (...args: any[]) => object = (...args: any[]) => object>(valueSchema: TValueSchema) => z.instanceof(ComputedValue<TValueSchema, TScopeGenerator>)
