import { ReactionTriggerReference, SelfObjectReference } from "./../../reference/index"
import { ExplicitObjectReference, ImplicictObjectReference, ObjectReference, ReactionDefinitionReference, ReactionInstructionReference, StrategyReference, StrictObjectReference } from "../../reference"
import { ReactionContext, ReactionHistory } from "./context"
import { ReactionPreProcessFunction, ReactionProcessFunction, ReactionPostProcessFunction, BaseContext } from "./processing"

import type { Strategy } from "../../strategy"
import { add, cloneDeep, has, isRegExp, last } from "lodash"
import { typing } from "@december/utils"
import { Object } from "../../reference/utils"
import { Parity, ParitySignature } from "../parity"
import type ReactiveCompilableObject from "../object"
import { CompilationManager } from "../.."
import { Reaction } from "."
import { ReactionTrigger } from "./triggers"

// export type IndexedReactionTarget = ReactionTarget & { index: number }

/**
 * A Reaction Definition is the recipe of what to do when a reaction is triggered.
 *
 * A reaction is triggered when a target property is updated. That calls a set of processing functions,
 *  with a specific object and context in mind.
 *
 * Many target properties can call the execution of the processing set of functions for a object. Those
 *  target properties are the watchlist, or "targets".
 *
 * That tuple (object, targets/target properties, context) is a Reaction Definition.
 *
 * A Reaction Definition can be implicit (i.e. the object is not explicitly known, but is defined as some implicit
 *  reference such as "self"). No reaction definition is indexed by the manager, since on indexing time we already
 *  know the correct object to inject in the tuple ("expliciting" the definition)
 *
 * A strategy, thus, is a group of reaction definitions. It defines two things: the order in which the reactions should
 *  be executed (tecnically the order in which the processing functions should be executed) for a given object AND
 *  the rule to group any reactions that should be run in a stack (we run all reactions from the same strategy together,
 *  since their very definition, code-wise, takes into account a linearity of execution).
 */

/**
 * A Reaction Definition is the set of processing functions that effectivelly transform a object after a target property update.
 */
export interface ReactionDefinition<TData extends object = object, TContext extends BaseContext = BaseContext> {
  name: string
  strategy: string

  preProcess?: ReactionPreProcessFunction<TData, TContext>
  process?: ReactionProcessFunction<TData, TContext>
  postProcess?: ReactionPostProcessFunction<TData, TContext>
}

/**
 * A Reaction Instruction is a tuple (parent, targets, definition, object) that explains where, when and what to run a reaction.
 *
 * The parent is the strategy reference (itself a tuple [object, strategy name]) that holds the instruction
 * The triggers are the patterns this instruction is following (i.e. waiting for an update on)
 * The definition is the set of processing functions that will be executed on trigger
 * The target is the object in the scope of execution of the processing functions
 */
export class ReactionInstruction<TParent extends SelfObjectReference | StrictObjectReference = SelfObjectReference | StrictObjectReference> {
  _parent: StrategyReference<TParent>
  _triggers: typing.Indexed<ReactionTrigger>[] = []
  _definition: ReactionDefinitionReference<ObjectReference>
  _target: ObjectReference
  _context?: ReactionContext[`hash`]
  //
  name: string
  parity?: ParitySignature

  constructor(name: string, parent: StrategyReference<TParent>, parity?: ParitySignature) {
    this.name = name
    this.parity = parity

    this._parent = parent
  }

  // Encapsulate all tuple properties to avoid directly messing with them, should make the refactor easier

  get parent() {
    return this._parent
  }

  get triggers() {
    return {
      get: () => this._triggers,
      add: (...triggers: ReactionTrigger[]) => {
        for (const trigger of triggers) {
          const index = this._triggers.length
          this._triggers.push({ ...trigger, _index: index })
        }
      },
    }
  }

  get definition() {
    return {
      set: (definition: ReactionDefinitionReference) => {
        if (this._definition) throw new Error(`Definition already set for instruction ${this.name}`)

        this._definition = definition
      },
      get: () => this._definition,
    }
  }

  get target() {
    return {
      set: (target: ObjectReference) => {
        if (this._target) throw new Error(`Target already set for instruction ${this.name}`)

        this._target = target
      },
      get: () => this._target,
    }
  }

  get context() {
    return {
      set: (key: string, value: any) => {
        this._context ??= {}
        this._context[key] = value
      },
      get: () => this._context,
    }
  }

  toReference(parent?: StrictObjectReference): ReactionInstructionReference<StrictObjectReference> {
    let object = parent ?? (this.parent.object as StrictObjectReference)

    if (!Object.isStrict(object)) {
      debugger
      throw new Error(`Cannot create a reference to a non-strict parent`)
    }

    return {
      object,
      strategy: this._parent.strategy,
      name: this.name,
    }
  }

  getTriggerReference(trigger: number, parent: StrictObjectReference): ReactionTriggerReference {
    return {
      instruction: this.toReference(parent),
      index: trigger,
    }
  }

  strictify(parent: StrategyReference<StrictObjectReference>): ReactionInstruction {
    const instruction = new ReactionInstruction(this.name, cloneDeep(parent), cloneDeep(this.parity))

    instruction._definition = cloneDeep(this._definition)
    instruction._target = cloneDeep(this._target)
    instruction._triggers = cloneDeep(this._triggers)
    instruction._context = this._context ? cloneDeep(this._context) : this._context

    return instruction
  }
}
