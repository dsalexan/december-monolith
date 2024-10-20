import { arrayJoin } from "@december/utils"
import { BasePatternMatch } from "@december/utils/match"
import { Indexed } from "@december/utils/typing"

import { paint, Builder, Block } from "../../../logger"

import { IntegrityEntryAddedEvent, TargetIntegrityEntryAddedEvent, IntegrityEntryUpdatedEvent, TargetIntegrityEntryUpdatedEvent, IntegrityEntryEventTypes, IntegrityEntryEvents, TargetIntegrityEntryEvents } from "./events/integrityEntry"
import { ReferenceAddedEvent, TargetReferenceAddedEvent, ReferenceEventTypes, ReferenceEvents, TargetReferenceEvents } from "./events/reference"
import { PropertyUpdatedEvent, TargetPropertyUpdatedEvent, PropertyEventTypes, PropertyEvents, TargetPropertyEvents } from "./events/property"
import { ImportEvent, ImportEvents } from "./events/import"
import type { BaseEventTrace } from "./base"
import { Nullable, WithOptionalKeys } from "tsdef"
import { omit } from "lodash"
import assert from "assert"

export { INTEGRITY_ENTRY_ADDED, INTEGRITY_ENTRY_UPDATED } from "./events/integrityEntry"
export { REFERNECE_ADDED } from "./events/reference"
export { PROPERTY_UPDATED } from "./events/property"

export type { IntegrityEntryAddedEvent, TargetIntegrityEntryAddedEvent, IntegrityEntryEventTypes, IntegrityEntryEvents, TargetIntegrityEntryEvents } from "./events/integrityEntry"
export type { ReferenceAddedEvent, TargetReferenceAddedEvent, ReferenceEventTypes, ReferenceEvents, TargetReferenceEvents } from "./events/reference"
export type { PropertyUpdatedEvent, TargetPropertyUpdatedEvent, PropertyEventTypes, PropertyEvents, TargetPropertyEvents } from "./events/property"
export type { ImportEvent, ImportEvents } from "./events/import"

export type Event = IntegrityEntryEvents | ReferenceEvents | PropertyEvents | ImportEvents
export type TargetEvent = TargetIntegrityEntryEvents | TargetReferenceEvents | TargetPropertyEvents
export type EventTypes = Event[`type`]

export type EventDispatcher<TEvent extends Event = Event, TTargetEvent extends TargetEvent = TargetEvent, TPatternMatch extends BasePatternMatch = BasePatternMatch> = TEvent & { dispatcher: TTargetEvent; matches: Indexed<TPatternMatch>[] }

export interface EventTrace extends BaseEventTrace {
  previousEvent: EventDispatcher
}

export interface TargetableObject {
  targetEvent: TargetEvent
}

export function makeArtificialEventTrace(event: Event | Omit<Event, `trace`>): EventTrace {
  const trace = (event as any).trace ?? (null as any)
  return {
    artificial: true,
    previousEvent: {
      dispatcher: null as any,
      matches: null as any,
      ...(event as Event),
      trace,
    },
  }
}

export function makeArtificilEventDispatcher(event: Event | Omit<Event, `trace`>): EventDispatcher {
  const trace = (event as any).trace ?? (null as any)

  return {
    dispatcher: null as any,
    matches: null as any,
    ...(event as Event),
    trace,
  }
}

/** Match events to targetEvents AND return match information */
export function matchEventToTargets<TTargetableObject extends TargetableObject = TargetableObject>(event: Event, targetables: TTargetableObject[]): { targetable: TTargetableObject; matches: Indexed<BasePatternMatch>[] }[] {
  // 1. Execute match for all targetables
  const matchesTargetEvents = targetables.map(targetable => {
    const targetEvent = targetable.targetEvent
    if (targetEvent.type !== event.type) return false

    let matchInfo: Indexed<BasePatternMatch>[] = null as any
    if (event.type === `property:updated`) {
      const property = (event as PropertyUpdatedEvent).property
      const properties = (targetEvent as TargetPropertyUpdatedEvent).properties

      matchInfo = properties.map((pattern, index) => ({ ...pattern.match(property), _index: index }))
    } else if (event.type === `reference:added`) {
      const reference = (event as ReferenceAddedEvent).reference
      const references = (targetEvent as TargetReferenceAddedEvent).references

      matchInfo = references.map((pattern, index) => ({ ...pattern.match(reference), _index: index }))
    } else if (event.type === `integrity_entry:updated`) {
      const entry = (event as IntegrityEntryUpdatedEvent).entry
      const entries = (targetEvent as TargetIntegrityEntryUpdatedEvent).entries

      matchInfo = entries.map((pattern, index) => ({ ...pattern.match(entry.key), _index: index }))
    } //
    else throw new Error(`Unimplemented event type "${event.type}"`)

    assert(matchInfo !== null, `MatchInfo should be defined`)
    matchInfo = matchInfo.filter(match => match.isMatch)

    return [targetable, matchInfo]
  }) as [TTargetableObject, Indexed<BasePatternMatch>[]][]

  // 2. Get only valid matches
  const matchedTargetEvents = matchesTargetEvents.filter(([, matchInfo]) => matchInfo.length > 0)

  // 3. Return merged data
  return matchedTargetEvents.map(([targetable, matchInfo]) => ({ targetable, matches: matchInfo }))
}

export function explainEvent(event: Event): Block[] {
  const blocks: Block[] = []

  if (event.type === `property:updated`) blocks.push(paint.white(event.property.toString()))
  else if (event.type === `reference:added`) blocks.push(paint.white(event.reference.toString()))
  else if (event.type === `integrity_entry:added`) blocks.push(...paint.grey.dim(`(`, paint.white(event.entry.key), `) "`, paint.grey(`${event.entry.value}`), `"`))
  else if (event.type === `integrity_entry:updated`)
    blocks.push(
      ...paint.grey.dim(
        `(`, //
        paint.white(event.entry.key),
        `) "`,
        paint.grey(event.previousValue),
        `" -> "`,
        paint.white(event.entry.value),
        `"`,
      ),
    )
  //
  else throw new Error(`Unimplemented event type "${(event as any).type}"`)

  return blocks
}

export function explainTargetEvent(targetEvent: TargetEvent): Block[] {
  if (targetEvent.type === `property:updated`)
    return [
      ...arrayJoin(
        targetEvent.properties.map(p => paint.white(p.toString())),
        paint.dim.grey(`, `),
      ),
      paint.identity(` `),
    ]
  if (targetEvent.type === `reference:added`)
    return [
      ...arrayJoin(
        targetEvent.references.map(p => paint.white(p.toString())),
        paint.dim.grey(`, `),
      ),
      paint.identity(` `),
    ]
  if (targetEvent.type === `integrity_entry:updated`)
    return [
      ...arrayJoin(
        targetEvent.entries.map(p => paint.white(p.toString())),
        paint.dim.grey(`, `),
      ),
      paint.identity(` `),
    ]

  throw new Error(`Unimplemented event type "${targetEvent.type}"`)
}

export function explainEventTrace({ previousEvent }: EventTrace): Block[] {
  const blocks: Block[] = []

  blocks.push(paint.cyan.dim(`${` `.repeat(1)}${`-`.repeat(29)}`))
  blocks.push(paint.cyan(`◀ `))
  blocks.push(paint.dim.cyan.italic(`(${previousEvent.type}) `))

  blocks.push(...explainEvent(previousEvent))

  return blocks
}
