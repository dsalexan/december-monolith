import { PropertyReferencePattern } from "@december/utils/access"

import { ObjectReference } from "../../../../object"
import { ObjectPropertyReference } from "../../../../object/property"

import { BaseEvent, BaseTargetEvent } from "../base"

/** Object used to FIRE event */
export interface ImportEvent extends BaseEvent {
  type: `import`
  origin: {
    file: string
    type: `gca`
  }
}

/** Object used to match some event when emitted */
// export interface TargetImportEvent extends BaseTargetEvent<ImportEvent, `property`> {
//   properties: PropertyReferencePattern<ObjectReference>[]
// }

export type ImportEvents = ImportEvent
// export type TargetPropertyEvents = TargetImportEvent

export type PropertyEventTypes = ImportEvents[`type`]

// export const PROPERTY_UPDATED = (...properties: PropertyReferencePattern<ObjectReference>[]): TargetImportEvent => ({ type: `property:updated`, properties })
