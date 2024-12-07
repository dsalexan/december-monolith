import { Environment, Node, ObjectSource } from "@december/tree"
import assert from "assert"

import { MutableObject, ObjectController } from "@december/compiler"
import { Reference } from "@december/utils/access"
import { isAlias } from "."
import { isNil } from "lodash"
import { NON_RESOLVED_VALUE } from "../../../tree/src2/environment/identifier"
import { isPropertyInvoker } from "../../../gca/src"

if (!global.gurps_BaseGURPSTraitEnvironment) {
  global.gurps_BaseGURPSTraitEnvironment = new Environment()
  // global.gurps_BaseGURPSTraitEnvironment.addObjectSource(`base-trait`, {
  //   thr: {
  //     type: `function`,
  //     value: function (this: Environment, data: unknown, node: Node) {
  //       const self = this._.get(`self`, [`global`])
  //       const character = this._.get(`character`, [`global`])

  //       assert(self, `self is not defined`)
  //       assert(character, `character is not defined`)

  //       const basedOn: string = self.damage.basedOn // this is a reference alias to source of trait's damage
  //       assert(isAlias(basedOn), `basedOn is not an alias`)

  //       const [basedOnObject] = character.controller.store.getByReference(new Reference(`alias`, basedOn), false)
  //       if (isNil(basedOnObject)) return NON_RESOLVED_VALUE

  //       debugger
  //       return null
  //     },
  //   },
  // })
}

export const BaseGURPSTraitEnvironment: Environment = global.gurps_BaseGURPSTraitEnvironment

export function makeGURPSTraitEnvironment(character: unknown, self: unknown) {
  const environment = BaseGURPSTraitEnvironment.clone()

  const source = ObjectSource.fromDictionary(`global:gurps`, {
    character: { type: `simple`, value: character },
    self: { type: `simple`, value: self },
  })

  source.addMatchEntry(
    {
      name: `fallback::trait:level:any`,
      fallback: true,
      value: { type: `simple`, value: 0 },
    },
    identifier => {
      if (isAlias(identifier.name)) return true

      const property = isPropertyInvoker(identifier.name)
      if (property && isAlias(property.target) && property.property === `level`) return true

      return false
    },
  )

  environment.addSource(source)
  return environment
}

// export function makeGURPSTraitFallbackEnvironment(character: unknown, self: unknown) {
//   const environment = BaseGURPSTraitEnvironment.clone()

//   environment.addObjectSource(`global:gurps:fallback`, {
//     character: { type: `simple`, value: character },
//     self: { type: `simple`, value: self },
//   })

//   return environment
// }
