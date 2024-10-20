import { PropertyReferencePattern } from "@december/utils/access"

import { ObjectReference } from "../../../../object"
import { ObjectPropertyReference } from "../../../../object/property"
import { IntegrityEntry, IntegrityEntryPattern } from "../../../integrityRegistry"

import { BaseEvent, BaseTargetEvent } from "../base"

/** Object used to FIRE event */
export interface IntegrityEntryAddedEvent extends BaseEvent {
  type: `integrity_entry:added`
  entry: IntegrityEntry
}

export interface IntegrityEntryUpdatedEvent extends BaseEvent {
  type: `integrity_entry:updated`
  entry: IntegrityEntry
  previousValue: IntegrityEntry[`value`]
}

export interface IntegrityEntryRemovedEvent extends BaseEvent {
  type: `integrity_entry:removed`
  entry: IntegrityEntry
}

/** Object used to match some event when emitted */
export interface TargetIntegrityEntryAddedEvent extends BaseTargetEvent<IntegrityEntryAddedEvent, `entry`> {
  entries: IntegrityEntryPattern[]
}

export interface TargetIntegrityEntryUpdatedEvent extends BaseTargetEvent<IntegrityEntryUpdatedEvent, `entry` | `previousValue`> {
  entries: IntegrityEntryPattern[]
}

export interface TargetIntegrityEntryRemovedEvent extends BaseTargetEvent<IntegrityEntryRemovedEvent, `entry`> {
  entries: IntegrityEntryPattern[]
}

export type IntegrityEntryEvents = IntegrityEntryAddedEvent | IntegrityEntryUpdatedEvent | IntegrityEntryRemovedEvent
export type TargetIntegrityEntryEvents = TargetIntegrityEntryAddedEvent | TargetIntegrityEntryUpdatedEvent | TargetIntegrityEntryRemovedEvent

export type IntegrityEntryEventTypes = IntegrityEntryEvents[`type`]

export const INTEGRITY_ENTRY_ADDED = (...entries: IntegrityEntryPattern[]): TargetIntegrityEntryAddedEvent => ({ type: `integrity_entry:added`, entries })
export const INTEGRITY_ENTRY_UPDATED = (...entries: IntegrityEntryPattern[]): TargetIntegrityEntryUpdatedEvent => ({ type: `integrity_entry:updated`, entries })
