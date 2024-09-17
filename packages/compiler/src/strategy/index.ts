import { PropertyReference } from "@december/utils/access"

import { EventListener } from "./../manager/events/emitter"
import { SET } from "../mutation"
import MutableObject from "../object"
import assert from "assert"

export type Strategy = (object: MutableObject) => EventListener[]

export const DEFAULT_STRATEGY: Strategy = (object: MutableObject) => {
  assert(object.id, `Object has no ID`)

  return [
    {
      event: {
        type: `update:property`,
        property: new PropertyReference(`id`, object.id, `_.GCA`),
      },
      id: `GCA:initialize`,
      listener: ({ manager }) => {
        const { name } = object.data._.GCA

        const mutations = [SET(`name`, name), SET(`__.aliases`, [`TR:${object.id === `1` ? `Uno` : `Dos`}`])]
        manager.mutator.enqueue(object.reference(`id`), ...mutations)
      },
    },
  ]
}
