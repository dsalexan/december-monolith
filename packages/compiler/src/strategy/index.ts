import { EventEmitter } from "@billjs/event-emitter"
import { get, set } from "lodash"

import { ANY_PROPERTY, PROPERTY, PropertyReference, PropertyReferencePattern, REFERENCE, PLACEHOLDER_SELF_REFERENCE } from "@december/utils/access"
import { OR } from "@december/utils/match/logical"
import { REGEX } from "@december/utils/match/element"
import { BasePattern } from "@december/utils/match/base"

import ObjectEventEmitter, { ListenerFunction, ListenerFunctionContext } from "./../manager/events/emitter"
import { SET, OVERRIDE } from "../mutation"
import MutableObject from "../object"
import assert from "assert"
import { Mutation } from "../mutation/mutation"
import { MutationGenerator } from "../manager/mutator"
import makeProcessor, { Environment, ProcessedData, Processor } from "../tree"
import { Event_Listen } from "../manager/events"

/**
 * WHAT IS A STRATEGY?
 *
 * - It is a list of event listeners, i.e. when a event is emitted, a listener is called
 * - This listeners, usually, enqueues a MUTATION GENERATOR for a specific object (i.e. a property is updated -> enqueue instructions to mutate object based on its value)
 *
 * - So a basic component of a strategy is:
 *
 *     (event, listener) <=> (event, mutation generator to be enqueued)
 *
 *  Sometimes we will need to PROXY events, i.e. call a listener for the event X when Y happens
 *  This demans some sort of "indexing" of listeners inside a strategy
 */

export type FunctionGenerator = (object: MutableObject, strategy: Strategy) => ListenerFunction

type FunctionName = string

export interface EventListener {
  event: Event_Listen
  fn: FunctionName
}

export class Strategy {
  generators: Map<FunctionName, FunctionGenerator> = new Map() // function name -> function declaration generator
  listeners: EventListener[] = []

  constructor() {}

  addFunction(name: string, fn: FunctionGenerator) {
    this.generators.set(name, fn)

    return this
  }

  addListener(event: Event_Listen, functionName: FunctionName) {
    assert(this.generators.has(functionName), `Function "${functionName}" not found`)

    this.listeners.push({
      event,
      fn: functionName,
    })

    return this
  }

  onUpdateProperty(name: string, properties: PropertyReferencePattern[], fn: FunctionGenerator) {
    this.addFunction(name, fn)
    this.addListener(
      {
        type: `update:property`,
        properties,
      },
      name,
    )

    return this
  }

  applyStrategy(object: MutableObject, eventEmitter: ObjectEventEmitter) {
    // 1. Add listeners to event emitter
    const listen = this.listen(object, eventEmitter)

    for (const { event, fn } of this.listeners) listen(event, fn)
  }

  listen(object: MutableObject, eventEmitter: ObjectEventEmitter) {
    return (event: Event_Listen, name: string) => {
      const fnGenerator = this.generators.get(name)
      assert(fnGenerator, `Function "${name}" not found`)
      const fn = fnGenerator(object, this)

      const id = `${object.id}::${name}`
      eventEmitter.on(fillEvent(event, object), { id, fn })
    }
  }

  proxy(object: MutableObject, eventEmitter: ObjectEventEmitter) {
    return (event: Event_Listen, name: string) => {
      const fnGenerator = this.generators.get(name)
      assert(fnGenerator, `Function "${name}" not found`)
      const fn = fnGenerator(object, this)

      const id = `${object.id}::(proxy):${name}`
      eventEmitter.on(fillEvent(event, object), { id, fn })
    }
  }
}

function fillEvent(event: Event_Listen, object: MutableObject): Event_Listen {
  if (event.type === `update:property`) {
    return {
      type: `update:property`,
      properties: event.properties.map(property => {
        if (property.referencePattern instanceof BasePattern) return property
        return PROPERTY(REFERENCE(`id`, object.id), property.propertyPattern)
      }),
    }
  } else if (event.type === `reference:indexed`) {
    return {
      type: `reference:indexed`,
      references: event.references.map(reference => reference),
    }
  }

  // @ts-ignore
  throw new Error(`Unimplemented event type "${event.type}"`)
}
