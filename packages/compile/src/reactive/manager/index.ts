import { EventEmitter } from "@billjs/event-emitter"
import { get, findIndex, groupBy, uniq, isNil, isEqual, isArray, orderBy, has, uniqBy, cloneDeep, last } from "lodash"

import { Instruction, ReactiveCompilableObject, Strategy } from "@december/compile"
import { Builder, paint } from "@december/logger"
import { arrayJoin, isNilOrEmpty, typing } from "@december/utils"

import CompilationManager from "../../compilation/newManager"
import AliasManager, { AliasIndexedEvent } from "../../alias"
import { ParallelReactionTraces, ReactionHistory } from "../reaction/context"
import { UpdateEvent } from "../../object"
import { AliasObjectReference, ExplicitPropertyReference, FlatObjectReference, PropertyReference, ReactionInstructionReference, StrictObjectReference, StrictPropertyReference } from "../../reference"
import { ParallelReaction, Reaction, unifyParallelReactions } from "../reaction"
import ReactiveIndexation, { FetchOptions } from "./indexation"

import * as Reference from "../../reference/utils"
import type { CompilationInstruction } from "../../compilation/newInstruction"
import { validatePolicy } from "../reaction/triggers/policy"

function extractPaths(key: string, object: unknown) {
  const paths: string[] = key === `` ? [] : [key]

  if (!typing.isPrimitive(object)) {
    // extract all paths in object
    const queue = [{ key, object }]
    while (queue.length > 0) {
      const { key, object } = queue.shift()!

      if (typeof object === `object` && object !== null) {
        for (const [k, v] of Object.entries(object)) {
          let _key = k
          if (_key.includes(`.`)) _key = `["${_key}"]`

          const path = key === `` ? _key : `${key}.${_key}`
          paths.push(path)
          queue.push({ key: path, object: v })
        }
      } else {
        paths.push(key)
      }
    }
  }

  return paths
}

export default class ReactiveCompilationManager extends CompilationManager {
  _: ReactiveIndexation = new ReactiveIndexation(this)

  // history of executed instructions
  history: Record<string, Record<string, ReactionHistory>> = {} // object id -> reaction pointer (as string) -> traces[]

  constructor(logger: Builder) {
    super(logger)
  }

  getReactionInstruction(reference: ReactionInstructionReference<StrictObjectReference>) {
    const object = this.objects[reference.object.id]
    const { strategy } = object.strategies[reference.strategy]
    const instruction = strategy.instructions[reference.name]

    return instruction
  }

  fetchProperty(property: ExplicitPropertyReference) {
    let object: ReactiveCompilableObject | null = null
    if (property.object.type === `id`) object = this.objects[property.object.id]
    else if (property.object.type === `alias`) {
      const _strict = this._._strict(property.object)

      if (_strict) object = this.objects[_strict.id]
    } else {
      // ERROR: Unimplemented object reference type
      debugger
    }

    if (!object) return undefined

    debugger
  }

  propertyGetter() {
    return (property: ExplicitPropertyReference) => this.fetchProperty(property)
  }

  /** Initialize reactive indexation for object (an its associated strategies) */
  _addObject(object: ReactiveCompilableObject, cluster?: string) {
    super._addObject(object, cluster)

    // CREATE INDEXES FOR THE FIRST TIME
    this._.index(object, object.strategies)
  }

  /** Watch object for updates */
  _listenObject(object: ReactiveCompilableObject) {
    super._listenObject(object)

    object.on(`update`, ({ data: { version, object: objectID, paths } }: { data: UpdateEvent }) => {
      const object = this.objects[objectID]

      const pendingReactions: Record<string, { properties: ExplicitPropertyReference<string>[]; options: Partial<FetchOptions> }> = {
        aliases: { properties: [], options: { useVariants: false } },
        regular: { properties: [], options: { useVariants: true } },
      }

      // 1. Update object referential indexes
      const _report = this._.update(object)

      // // 1.5. The first time a alias is stablished, we should react to ALL paths within the object specifically for that alias (not to all variants, JUST the new aliases)
      // const newAliases: string[] = _report.added.filter(reference => reference.startsWith(`alias:`))
      // for (const alias of newAliases) {
      //   const object: AliasObjectReference = Reference.Object.unflatten(alias)

      //   // Get all paths in object data
      //   //        Do not use "*" any path. We actually need to get all paths in the object data (since any would call reactions to properties that don't exist)
      //   const paths: string[] = extractPaths(``, object)
      //   for (const path of paths) pendingReactions.aliases.properties.push({ object, path })
      // }

      // 2. React to changed paths (taking referential mapping into consideration)
      for (const path of paths) pendingReactions.regular.properties.push({ object: { type: `id`, id: objectID }, path })

      // 3. Trigger all reactions that watch for an update in one of the properties previously defined
      for (const { properties, options } of Object.values(pendingReactions)) {
        if (properties.length === 0) continue

        /**
         * Since react calls fetch, and fetch handles aliases now (since they are tracket by updating the object referential index on every update event)
         *  we don't need to worry about warning anyone about a alias change, since the reaction will be connected to a alias and that alias will be recognized as a id inside fetch
         */
        const reactions = this._.react(properties, options)

        // instruct manager
        for (const parallelReaction of reactions) {
          // here we don't really care about parallelism, the stack itself will handle it upon pushing the instruction
          const reaction = unifyParallelReactions(parallelReaction)

          // create instruction from reaction at current stack
          this.addInstruction(reaction)
        }
      }
    })
  }

  /** Check if any object is waiting for some lifecycle event (i.e. has some reaction looking at lifecycle events) */
  lifecycle(event: string) {
    const stack = `${this._currentStack}->${event}`

    // 1. Trigger all reactions that watch this event
    const reactions = this._.handle(event)

    for (const parallelReaction of reactions) {
      // here we don't really care about parallelism, the stack itself will handle it upon pushing the instruction
      const reaction = unifyParallelReactions(parallelReaction)

      // create instruction from reaction, but in a specific stack tagged to handle reactions born from this event
      this.addInstruction(reaction, stack)
    }
  }

  _compile() {
    const workWasDone = super._compile()

    if (workWasDone) {
      // run event to inform that all stacks were compiled
      this.lifecycle(`compile:done`)
    }

    return workWasDone
  }

  _compileStack(stackIndex: number) {
    const workWasDone = super._compileStack(stackIndex)

    if (workWasDone) {
      // run event to inform that compilation of a stack is done
      this.lifecycle(`stack:compile:done`)

      // if there was any changes to references, run event
      if (this.objectReferentialOperations.current !== this.objectReferentialOperations.previous) {
        this.lifecycle(`aliases:ready`)

        this.objectReferentialOperations.previous = this.objectReferentialOperations.current
      }
    }

    return workWasDone
  }

  validateInstruction(instruction: CompilationInstruction): boolean {
    if (!super.validateInstruction(instruction)) return false
    // _history: Record<string, Record<string, CompilationTrigger[][]>> = {}
    //              object id -> reaction pointer (as string) -> traces[]
    //

    /**
     * Definition and Context (ParallelContexts actually) are, as of now, not relevant to determine if a reaction is valid or not.
     *
     * Mostly we look to the reaction instruction that queued the reaction to run.
     *
     * DEFINITION'S OBJECT vs INSTRUCTIONS'S SOURCE OBJECT vs INSTRUCTION'S SCOPE OBJECT vs TRIGER EVENT'S PROPERTY OBJECT
     *
     *    The definition's object is the object that hosts the set of processing functions to be executed (actually the object that hosts the strategy that hosts the set of functions).
     *    The triger event's property object is the object that was updated and caused the reaction to run.
     *    The instruction's source object is the object that hosts the instruction that queued the reaction to run.
     *    The instruction's scope object is the object in which the processing functions will run.
     *
     */

    // aggregate all traces
    const { reaction } = instruction
    const traces: ParallelReactionTraces = reaction.parallels.map(p => p.trace)

    // for all traces responsible for this reaction running, check if any of them is valid
    for (const trigger of traces) {
      // since a "trigger" is a linear sequence of events, we can assume that the last event is the most important one

      const event = last(trigger)!

      // 0. get reaction instruction
      const instruction = this.getReactionInstruction(event._trigger._reference.instruction)

      // 0. fetch history
      //    strictify target object
      const target = this._._strict(instruction.target.get(), event._trigger._reference.instruction.object.id)!
      const reference = Reference.Reaction.flatten(reaction.definition)
      const history = this._history[target.id][reference] ?? []

      // DEBUG: Stop here, never properly tested
      // @ts-ignore
      if (instruction.triggers[event.property?.index]?.policy === `fallback`) debugger

      // 1. check if instruction is rule-safe for reference update (since a reaction most commonly runs in a reference - majoritarily path - update)
      if (event.type === `event` || event.type === `property`) {
        // const trigger = instruction.triggers[event._trigger._reference.index]
        const isValid = validatePolicy(event._trigger, history)

        if (isValid) return true
      }
    }

    return false
  }
}
