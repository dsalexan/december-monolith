import { PropertyReferencePattern } from "@december/utils/access"

import { ObjectReference } from "../../../../object"
import { ObjectPropertyReference } from "../../../../object/property"

import { BaseEvent, BaseTargetEvent } from "../base"

/** Object used to FIRE event */
export interface InvokeEvent extends BaseEvent {
  type: `invoke`
  origin: {
    frame: string
  }
}

/** Object used to match some event when emitted */
// export interface TargetImportEvent extends BaseTargetEvent<InvokeEvent, `property`> {
//   properties: PropertyReferencePattern<ObjectReference>[]
// }

export type InvokeEvents = InvokeEvent
// export type TargetPropertyEvents = TargetImportEvent

export type PropertyEventTypes = InvokeEvent[`type`]

// export const PROPERTY_UPDATED = (...properties: PropertyReferencePattern<ObjectReference>[]): TargetImportEvent => ({ type: `property:updated`, properties })
