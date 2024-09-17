import { get } from "lodash"

import { PROPERTY, PropertyReference, REFERENCE } from "@december/utils/access"
import { OR } from "@december/utils/match/logical"

import { EventListener } from "./../manager/events/emitter"
import { SET } from "../mutation"
import MutableObject from "../object"
import assert from "assert"
import { OVERRIDE } from "../mutation/mutation"

export type Strategy = (object: MutableObject) => EventListener[]

export const DEFAULT_STRATEGY: Strategy = (object: MutableObject) => {
  assert(object.id, `Object has no ID`)

  return [
    {
      event: {
        type: `update:property`,
        properties: [PROPERTY(REFERENCE(`id`, object.id), `_.GCA`)],
      },
      id: `GCA:initialize`,
      listener: ({ manager }) => {
        const { name } = object.data._.GCA

        const mutations = [SET(`__.aliases`, [`TR:${object.id === `1` ? `Uno` : `Dos`}`])]
        manager.mutator.enqueue(object.reference(`id`), ...mutations)
      },
    },
    //
    {
      event: {
        type: `update:property`,
        properties: [PROPERTY(REFERENCE(`id`, object.id), `_.GCA.name`), PROPERTY(REFERENCE(`id`, object.id), `_.INPUT.name`)],
      },
      id: `compute:name`,
      listener: ({ manager }) => {
        const name = get(object.data, `_.INPUT.name`, object.data._.GCA.name)

        return manager.mutator.enqueue(object.reference(`id`), OVERRIDE(`name`, name))
      },
    },
  ]
}
