import { PropertyReferencePattern, ReferencePattern } from "@december/utils/access"

import { ObjectReference } from "../../../object"
import { ObjectPropertyReference } from "../../../object/property"
import { IntegrityEntry } from "../../integrityRegistry"

import type { Event, EventDispatcher } from "."

export interface BaseEventTrace {
  artificial?: boolean
  previousEvent: BaseEvent
}

export interface BaseEvent {
  type: string
  trace: BaseEventTrace
}

export type BaseTargetEvent<TEvent extends BaseEvent, OmitKeys extends keyof TEvent = `trace`> = Omit<TEvent, OmitKeys | `trace`>
