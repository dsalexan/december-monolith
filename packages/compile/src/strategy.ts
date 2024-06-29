import { isArray, isRegExp, isString } from "lodash"
import { ReactionDefinition, ReactionInstruction } from "./reactive/reaction/definition"
import { ExplicitObjectReference, ImplicictObjectReference, ObjectReference, ReactionDefinitionReference, SelfObjectReference, StrictObjectReference } from "./reference"

import { isNilOrEmpty, typing } from "@december/utils"
import { BaseContext, ReactionPreProcessFunction, ReactionProcessFunction, ReactionPostProcessFunction } from "./reactive/reaction/processing"
import { defineReactionTrigger, FastReactionTrigger, ReactionTrigger } from "./reactive/reaction/triggers"

/**
 * A Strategy is a group of reactions that should be executed in a specific order in the same "run".
 *
 * It is, mostly, a devide to facilitate the implementation of baseline descriptions of many objects (in GURPS terms, traits)
 *  for a system. That makes the strategy's reactions a "generic" set, destined to any object. So, by default, all definitions
 *  are implicit (referencing the "self" object).
 *
 * Also, the strategy is where the processingSet is going to be stored (under the definition's name).
 *
 * REMEMBER: The set implies the order of execution (by it's name)
 *
 * A strategy also hold a list of implicit tuples (object, targets, definition) that hold all necessary information to index a reaction.
 *  object is, as a implicit, a default "self"
 *  targets is a list of target properties that will trigger the reaction
 *  definition is the definition reference that will be executed (the definition itself, with the function declarations, is also stored in this strategy)
 *
 *  This we call a "ReactionInstruction"
 */

export class Strategy<TData extends object = object> {
  name: string
  //
  order: string[] // order of execution of definition (since a pre-determined order is assumed for strategies, to facilitate implementation)
  definitions: Map<string, typing.Indexed<ReactionDefinition<TData>>> // index of reaction definitions by name (name -> definition)
  //
  instructions: Record<string, ReactionInstruction> // really just a passthrough to help in indexation (there they will become explicit instructions)
  /** most instructions (those created in generic manual strategies) will have source = self and scope = self
   *    this only changes with instructions create dynamically (in runtime we would know a id or alias pro properly point shit)
   */

  constructor(name: string) {
    this.name = name
    //
    this.order = []
    this.definitions = new Map()
    //
    this.instructions = {}
  }

  static make<TData extends object = object>(name: string): Strategy<TData> {
    return new Strategy<TData>(name)
  }

  /** Returns a definition reference inside this strategy */
  definition(name: string): ReactionDefinitionReference
  definition<TObject extends ObjectReference = ObjectReference>(name: string, object?: TObject): ReactionDefinitionReference<TObject>
  definition<TObject extends ObjectReference = ObjectReference>(name: string, object?: TObject): ReactionDefinitionReference<ObjectReference> {
    let _object: ObjectReference = { type: `self` } as SelfObjectReference
    if (object) _object = object

    return {
      object: _object,
      strategy: this.name,
      name,
    }
  }

  /**
   * Pushes an array of "ReactionImplementations" (a structure to hold both instructions AND definitions to facilitate implementation)
   */
  push<TDataLocal extends object = TData>(...reactions: ReactionImplementationWrapper<TDataLocal>[]): this {
    for (const o of reactions) {
      const instruction = o.instruction(this.name)
      const definition = o.definition(this.name) as any as ReactionDefinition<TData, BaseContext>

      // ERROR: Names should be unique
      if (this.order.some(name => name === definition.name)) debugger

      // register definition in strategy
      this.order.push(definition.name)
      this.definitions.set(definition.name, {
        ...definition,
        _index: this.definitions.size,
      })

      // register instruction in passthrough variable
      instruction.name = instruction.name ?? definition.name
      this.addInstruction(instruction)
    }

    return this
  }

  addInstruction(instruction: ReactionInstruction) {
    // ERROR: Instruction names should be unique
    if (this.instructions[instruction.name]) debugger

    this.instructions[instruction.name] = instruction
  }
}

export class Factory<TData extends object = object> {
  strategy<TDataLocal extends object = TData>(name: string): Strategy<TDataLocal> {
    return Strategy.make<TDataLocal>(name)
  }

  reaction<TDataLocal extends object = TData>(...triggers: FastReactionTrigger[]) {
    const factory = new ReactionImplementationWrapper<TDataLocal>()

    return factory.triggers(...triggers)
  }
}

export class ReactionImplementationWrapper<TData extends object = object, TContext extends BaseContext = BaseContext> {
  _triggers: ReactionTrigger[]
  _definition: ReactionDefinition<TData, TContext>

  constructor() {
    this._triggers = []
    this._definition = {} as any
  }

  // #region Factories

  definition(strategy: string) {
    // ERROR: Definition must be named (uniq)
    if (isNilOrEmpty(this._definition.name)) debugger

    // ERROR: Definition must have at least one processing function
    if (!this._definition.preProcess && !this._definition.process && !this._definition.postProcess) debugger

    return { ...this._definition, strategy }
  }

  instruction(strategy: string): ReactionInstruction {
    // TODO: Remove this restriction later

    // ERROR: Definition must be named (uniq)
    if (isNilOrEmpty(this._definition.name)) debugger

    // ERROR: Instruction should have at least one target
    if (this._triggers.length === 0) debugger

    const self: SelfObjectReference = { type: `self` }

    /** "Self" here means that the definition will be hosted by the same object that created the instruction */
    const definition: ReactionDefinitionReference<SelfObjectReference> = { object: self, strategy, name: this._definition.name }

    // since it is a implicit defined manually, use the same name as definition (doesnt really matter if they are the same, but it needs a name)

    /**
     * "Self Scope" here means that this instruction will update the very object that hosts it.
     *    Instructions can update other objects, but that use case is not relevant for ImplementationWrapper (since it always deals with generic strategies)
     *    Instructions updating other objects could be found in dynamic instructions, mostly instantiated inside some generic strategy (see trait strategy, for examples)
     *
     * "Self Source" here means that this instruction will be hosted by the "closest object", the object that is creating the instruction
     */
    const instruction = new ReactionInstruction(this._definition.name, { object: self, strategy }) //(self, self, strategy, this._definition.name, this._following, definition)
    instruction.triggers.add(...this._triggers)
    instruction.definition.set(definition)
    instruction.target.set(self)

    return instruction
  }

  // #endregion

  name(name: string): this {
    this._definition.name = name

    return this
  }

  triggers(...listOfTargetOrPathOrPathWithPolicy: FastReactionTrigger[]): this {
    for (const triggerOrPthOrPathWithPolicy of listOfTargetOrPathOrPathWithPolicy) {
      const trigger = defineReactionTrigger(triggerOrPthOrPathWithPolicy, { type: `self` })

      // ERROR: Unimplemented execution policy
      if (![`always`, `once`, `fallback`].includes(trigger.policy)) debugger

      this._triggers.push(trigger)
    }

    return this
  }

  preProcess<TDataLocal extends object = TData>(fn: ReactionPreProcessFunction<TDataLocal>): this {
    // HACK: This will drive me crazy eventually
    this._definition.preProcess = fn as any as ReactionPreProcessFunction<TData>
    return this
  }

  process<TDataLocal extends object = TData>(fn: ReactionProcessFunction<TDataLocal>): this {
    // HACK: This will drive me crazy eventually
    this._definition.process = fn as any as ReactionProcessFunction<TData>
    return this
  }

  postProcess<TDataLocal extends object = TData>(fn: ReactionPostProcessFunction<TDataLocal>): this {
    // HACK: This will drive me crazy eventually
    this._definition.postProcess = fn as any as ReactionPostProcessFunction<TData>
    return this
  }
}
