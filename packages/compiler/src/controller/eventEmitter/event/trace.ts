import { MaybeUndefined } from "tsdef"

import { paint, Builder } from "../../../logger"

import { ObjectReference } from "../../../object"
import { ObjectPropertyReference } from "../../../object/property"
import { IntegrityEntry } from "../../integrityRegistry"

// export interface BaseEventTrace {
//   type: string
// }

// export interface ReferenceEventTrace extends BaseEventTrace {
//   type: `reference`
//   action: `added` | `updated` | `removed`
//   reference: ObjectReference
// }

// export interface CascadeUpdateEventTrace extends BaseEventTrace {
//   type: `cascade-update`
//   object: ObjectReference
//   properties: ObjectPropertyReference[`property`][]
// }

// export interface IntegrityEntryEventTrace extends BaseEventTrace {
//   type: `integrity-entry`
//   action: `added` | `updated`
//   entry: IntegrityEntry
//   expectedValue: MaybeUndefined<IntegrityEntry[`value`]> // can be undefined if no value was expected
// }

// export type EventTrace = CascadeUpdateEventTrace | ReferenceEventTrace | IntegrityEntryEventTrace

// export function explainEventTrace(_logger: Builder, trace: EventTrace) {
//   _logger.add(paint.cyan.dim(`${` `.repeat(1)}${`-`.repeat(29)}`))
//   _logger.add(paint.cyan(`◀ `))
//   _logger.add(paint.dim.cyan.italic(`(${trace.type}) `))

//   if (trace.type === `cascade-update`) {
//     _logger.add(paint.dim.white(`${trace.object.toString()}:`))
//     if (trace.properties.length === 1) _logger.add(paint.white(`${trace.properties[0].toString()}`))
//     else _logger.add(paint.dim.grey(`{${trace.properties.length} properties}`))
//   } else if (trace.type === `reference`) {
//     _logger
//       .add(paint.dim.white(`${trace.action} `)) //
//       .add(paint.white(`${trace.reference.toString()}`))
//   } else if (trace.type === `integrity-entry`) {
//     _logger
//       .add(paint.grey(`(`)) //
//       .add(paint.grey.dim(`${trace.action} `)) //
//       .add(paint.white(`${trace.entry.key} `)) //
//       .add(paint.grey(`) `)) //
//       .add(paint.grey.dim(`"`)) //
//       .add(paint.white.bold(`${trace.entry.value}`))
//       .add(paint.grey.dim(`"`)) //
//       .add(paint.grey.dim(` <> `)) //
//       .add(paint.grey(`${trace.expectedValue}`))
//   } else {
//     // @ts-ignore
//     throw new Error(`Unimplemented event trace type "${trace.type}"`)
//   }
// }
