// import { Environment, Node, ObjectSource } from "@december/tree"
import assert from "assert"

import { MutableObject, ObjectController } from "@december/compiler"
import { Environment } from "@december/tree/interpreter"
import { Reference } from "@december/utils/access"
import { isAlias } from "."
import { isNil } from "lodash"
// import { NON_RESOLVED_VALUE } from "../../../tree/src/environment/identifier"
import { isPropertyInvoker } from "../../../gca/src"
import { makeGURPSEnvironment } from "../environment"

export function makeGURPSTraitEnvironment(character: MutableObject, self: unknown) {}

// export function makeGURPSTraitEnvironment(character: MutableObject, self: unknown) {
//   const environment = makeGURPSEnvironment(character)

//   const source = ObjectSource.fromDictionary(`global:gurps:trait`, {
//     self: { type: `simple`, value: self },
//   })

//   source.addMatchEntry(
//     {
//       name: `fallback::trait:level:any`,
//       fallback: true,
//       value: { type: `simple`, value: 0 },
//     },
//     identifier => {
//       if (isAlias(identifier.name)) return true

//       const property = isPropertyInvoker(identifier.name)
//       if (property && isAlias(property.target) && property.property === `level`) return true

//       return false
//     },
//   )

//   environment.addSource(source)
//   return environment
// }

// export function makeGURPSTraitFallbackEnvironment(character: unknown, self: unknown) {
//   const environment = BaseGURPSTraitEnvironment.clone()

//   environment.addObjectSource(`global:gurps:fallback`, {
//     character: { type: `simple`, value: character },
//     self: { type: `simple`, value: self },
//   })

//   return environment
// }
