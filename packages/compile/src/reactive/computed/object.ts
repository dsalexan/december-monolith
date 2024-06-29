import { get, has, set } from "lodash"
import { z, ZodType } from "zod"

import { typing } from "@december/utils"

import { Parity, ParityKey, ParitySignature } from "../parity"
import type { CompilationManager, Reaction, ReactiveCompilationManager } from "../.."

import { EventTrigger, ReactionTrigger, ExplicitReactionTrigger } from "../reaction/triggers"
import { ParallelReaction } from "../reaction"
import { ReactionInstruction } from "../reaction/definition"
import { ExplicitPropertyReference, ReactionDefinitionReference, StrictObjectReference } from "../../reference"
import type { ComputedValue } from "./value"

/**
 * A Computed Object is the structural runtime "controller" that adapts a expression and interpreter to reactive instructions to be compiled
 */

export type ComputationFunction<TScopeGenerator extends (...args: any[]) => object, TResult> = (scope: Parameters<TScopeGenerator>) => TResult

export interface ScopeSymbol {
  id: string // symbol id
  key: string // scope key
  trigger: ExplicitReactionTrigger // reaction trigger to find target object
  // value of the symbol
  value: { type: `self` } | { type: `path`; path: string } | { type: `function`; fn: (data: object | null, compilationManager: CompilationManager) => unknown }
}

export type ScopeSymbolMap = Record<ScopeSymbol[`id`], ScopeSymbol[]>

export class ComputedObject<TScopeGenerator extends (...args: any[]) => object, TResult = never> {
  value: ComputedValue<TResult, TScopeGenerator>
  fn: ComputationFunction<TScopeGenerator, TResult>
  //
  symbols: ScopeSymbolMap

  get key() {
    return this.value.key
  }

  get parity() {
    return this.value.parity
  }

  constructor(value: ComputedValue<TResult, TScopeGenerator>, symbols: ScopeSymbolMap, compute: ComputationFunction<TScopeGenerator, TResult>) {
    this.value = value
    this.fn = compute
    //
    this.symbols = symbols
  }

  get isReady() {
    // TODO: It is only ready if there are no unresolved references
    return Object.keys(this.symbols).length === 0
  }

  /** Compute final value */
  compute<TResultLocal = never, TResultComposite = TResult extends never ? TResultLocal : TResult>(scope: Parameters<TScopeGenerator>): TResultComposite {
    // ERROR: Can only compute unready object when a scope is provided
    if (!scope && !this.isReady) debugger

    /**
     * A tree/interpreter flux would be:
     *    1. parse expression (source) into a tree
     *    2. interpret (interpreter.process) the tree (needs interpreted object, scope and options)
     *    3. list missing scope as references (all unresolved)
     *    4. wait of references to be resolved
     *    5. interpret again (needs interpreted object, scope and options)
     */

    return this.fn(scope) as any as TResultComposite
  }

  /** Calculates a extended scope from all references (derived from missing scope in original interpretation of expression) */
  scope(fetchPropertyFn: (property: ExplicitPropertyReference) => unknown) {
    const scope: Record<string, any> = {}

    for (const [id, symbols] of Object.entries(this.symbols)) {
      if (symbols.length !== 1) debugger
      const [{ key, trigger }] = symbols

      // ERROR: Wtf
      if (trigger.type !== `property`) {
        debugger
        throw new Error(`Unimplemented trigger type`)
      }

      const value = fetchPropertyFn(trigger.property)

      // alias not found
      if (value !== undefined) debugger

      scope[key] = value ?? null
    }

    return scope
  }

  /** Build a list of reaction instructions to be executed when references (aliases) are found or updated */
  instructions(parent: StrictObjectReference, target: StrictObjectReference, definition: ReactionDefinitionReference<StrictObjectReference>): ReactionInstruction[] {
    const symbols = Object.values(this.symbols).flat()
    const triggers = symbols.map(({ trigger }) => trigger)

    // for each "trigger" (an alias for an object and property path), create a instruction to react when it is "found"/one of its properties is updated

    // PARENT: object that holds the instruction
    // TARGET: object that the processing functions will run on
    // DEFINITION OBJECT: object that holds the processing functions

    // Inject a forwarding from "event:aliases:ready" -> reaction, in case no reference is ever found (as a fallback to finish the calculations) (it is only called when some new alias is added, SO NOT GOOD)
    const aliasesReady: EventTrigger = { type: `event`, name: `aliases:ready`, policy: `fallback` }

    // if none of the aliases are found, compute the instruction anyway after the entire compilation is done (not a stack:compile:done, when ALL stacks are done)
    const compileDone: EventTrigger = { type: `event`, name: `compile:done`, policy: `once` }

    const instruction = new ReactionInstruction(this.key, { object: parent, strategy: `local` }, this.parity.signature())
    instruction.triggers.add(...triggers, aliasesReady, compileDone)
    instruction.definition.set(definition)
    instruction.target.set(target)
    instruction.context.set(`computedValueKey`, this.key)

    // const fallback = new ReactionInstruction(`${this.key}:fallback`, { object: parent, strategy: `local` }, this.parity.signature())
    // fallback.triggers.add(aliasesReady)
    // fallback.definition.set(definition)
    // fallback.target.set(target)
    // fallback.context.set(`computedValueKey`, this.key)

    return [instruction]
  }
}

/** Interface that declares HOW to adapt a ComputedValue into an ComputedObject (since the implementation can change depending on how to properly compute the original raw value [also called "_expression"]) */
export type ComputedValueObjectAdapter<TScopeGenerator extends (...args: any[]) => object, TValue = unknown> = (computedValue: ComputedValue<TValue, TScopeGenerator>, symbols: ScopeSymbolMap, meta: object) => ComputedObject<TScopeGenerator>
