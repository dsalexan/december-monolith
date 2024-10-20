/**
 * WHAT IS A STRATEGY?
 *
 * It is a collection of generic mutation functions to be applied to objects.
 * It can also hold prototype versions of listeners for those functions.
 * Basically is a streamlined generic approach to populate all managers for a controller.
 *
 *
 * MUTATION FUNCTION
 *    The ObjectCallQueue will run this function (with object as "this")
 *    The returned list of mutations will be applied into the object, updating it (this will cascade a property:updated event, but it is not relevant now)
 *    The function can be enqueued manually, BUT it is usually enqueued in response to a property:updated event (i.e. the ObjectCallQueue.enqueue is called inside a listener callback)
 *    It is registered in ObjectFrameRegistry as a frame (function + relevant metadata) by applying a strategy to an object
 *      It can, theoretically, be registered manually too
 *
 * LISTENER CALLBACK
 *    The function called when a specific event is triggered
 *    The object that triggered doesn't necessarely mean much
 *    Usually the callback will be the one to enqueue a mutation function (note, ENQUEUE, not register)
 *      It can enqueue a non-existent function, but somewhere along the way it would trigger an exception
 */

import assert from "assert"
import { get, isNil } from "lodash"

import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, Reference, REFERENCE, SELF_PROPERTY } from "@december/utils/access"
import { isAlias } from "@december/gurps/trait"

import MutableObject from "../../object"
import { Mutation, OVERRIDE, SET, MERGE } from "../../mutation/mutation"

import { Strategy } from "./index"
import { ReferenceAddedEvent, REFERNECE_ADDED } from "../eventEmitter/event"
import { CallQueue } from "../callQueue/queue"
import { GenericListener, Listener } from "../eventEmitter/listener"
import { BareExecutionContext } from "../callQueue"
import { MutationFunctionMetadata } from "../frameRegistry/mutationFrame"
import { ProcessingSymbolsOptions, ProcessorOptions } from "../../processor"
import { IntegrityEntry } from "../integrityRegistry"

export const EXAMPLE_STRATEGY = new Strategy()

// A.1. BASIC
EXAMPLE_STRATEGY.registerMutationFunction(
  `GCA:alias`, //
  (object: MutableObject) => [SET(`__.aliases`, [`TR:${object.id === `1` ? `Uno` : `Dos`}`])],
).addListener(
  {
    type: `property:updated`,
    properties: [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA`)],
  },
  (object: MutableObject) =>
    (event, { listener, eventEmitter }) => {
      // object.controller.callQueue.enqueue(object.reference(), { name: `GCA:alias` })
      eventEmitter.controller.callQueue.enqueue(object.reference(), { eventDispatcher: event, name: `GCA:alias` })
    },
)

// A.2. COMMON PROPERTY UPDATED
EXAMPLE_STRATEGY.registerMutationFunction(`compute:level`, (object: MutableObject) => {
  const { level } = object.data._.GCA
  if (isNil(level)) return []

  const numericLevel = parseInt(level)
  assert(!isNaN(numericLevel), `Level "${level}" is not a number`)

  return SET(`level`, numericLevel)
}).onPropertyUpdated(
  [SELF_PROPERTY(`_.GCA.level`)], //
  (object: MutableObject) =>
    (event, { listener, eventEmitter }) =>
      eventEmitter.controller.callQueue.enqueue(object.reference(), { eventDispatcher: event, name: `GCA:level` }),
)

// A.3. COMMON MINIMAL FOOTPRINT
EXAMPLE_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`_.GCA.name`), SELF_PROPERTY(`_.INPUT.name`)], //
  `compute:name`,
  object => OVERRIDE(`name`, get(object.data, `_.INPUT.name`, object.data._.GCA.name)),
)

// B.1. Calling other mutations functions on proxy
EXAMPLE_STRATEGY.registerMutationFunction(`compute:bonus`, (target, { arguments: args, callQueue, executionContext: { eventDispatcher: event } }: MutationFunctionMetadata<ReferenceAddedEvent>) => {
  // object: origin of bonus
  // target: destination of bonus

  const { modeIndex, bonusIndex, originReference } = args

  const [object] = callQueue.controller.store.getByReference(originReference, false) ?? []
  assert(!isNil(object), `Object "${originReference}" not found, this should not happen`)

  assert(!isNil(modeIndex), `Mode index "${modeIndex}" is not a number`)
  assert(!isNil(bonusIndex), `Bonus index "${bonusIndex}" is not a number`)

  const mode = get(object.data, `_.GCA.modes[${modeIndex}]`)

  const bonus = parseInt(mode.bonus[bonusIndex].value)
  const level = get(target.data, `level`)

  assert(!isNaN(bonus), `Bonus "${bonus}" is not a number`)
  assert(!isNaN(level), `Level "${level}" is not a number`)

  return [OVERRIDE(`level`, level + bonus)]
})

EXAMPLE_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`_.GCA`)], //
  `GCA:bonus`,
  (object, { callQueue }) => {
    const { modes: _modes } = object.data._.GCA
    if (!_modes) return []

    const modes: unknown[] = []
    for (const [index, { id, name, value, bonus }] of _modes.entries()) {
      const mode = { id, name }

      if (bonus) {
        const target = bonus[0].target

        Strategy.addProxyListener(REFERNECE_ADDED(REFERENCE(`alias`, target)), `compute:bonus`, { arguments: { modeIndex: index, bonusIndex: 0 } })(object)
      }
    }

    return SET(`modes`, modes)
  },
)

// C.1. Processing functions

// 1. We first stablish general processing options for GCA
const GCAProcessingSymbolsOptions: ProcessingSymbolsOptions = {
  isProxiableIdentifier: ({ content, value }) => isAlias(value),
  // TODO: It is not always going to be "level"
  identifierSymbolToPropertyPattern: ({ content, value }) => PROPERTY(REFERENCE(`alias`, value), `level`),
}

const GCAProcessingOptions: ProcessorOptions & ProcessingSymbolsOptions = {
  ...GCAProcessingSymbolsOptions,
  unitManager: null as any,
}

// 2. We then add compute:processing, since most processings can be finished using generic algorithms
EXAMPLE_STRATEGY.registerProcessingFunction(`compute:processing`, controller => ({
  ...GCAProcessingOptions,
  referenceToSource: referenceKey => {
    const [object] = controller.store.getByReference(new Reference(`alias`, referenceKey), false)

    // if reference is found
    // TODO: It is not always going to be "level"
    if (object && !isNil(object.data.level)) return { [referenceKey]: object.data.level }

    return null
  },
}))

// 3. The mutation function then calls Strategy.preProcess pointing to some specific mutation function as reaction (by default, compute:processing)
EXAMPLE_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`_.GCA`)], //
  `GCA:value`,
  (object, { callQueue, executionContext }) => {
    const { modes: _modes } = object.data._.GCA
    if (!_modes) return []

    const mutations: Mutation[] = []
    const integrityEntries: IntegrityEntry[] = []

    for (const [index, { id, name, value, bonus }] of _modes.entries()) {
      if (value) {
        const path = { original: `_.GCA.modes[${index}].value`, target: `modes[${index}].value` }
        const preProcessing = Strategy.preProcess(object, path, { scope: `math-enabled`, executionContext, ...GCAProcessingOptions })

        mutations.push(...preProcessing.mutations)
        integrityEntries.push(...preProcessing.integrityEntries)
      }
    }

    return { mutations, integrityEntries }
  },
)
