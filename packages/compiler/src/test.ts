import ObjectManager from "./manager"
import { SET } from "./mutation"
import MutableObject from "./object"
import { DEFAULT_STRATEGY } from "./strategy"

const rawObjects = [
  {
    id: `1`,
    name: `TraitA`,
    modes: [
      {
        id: `11`, //
        name: `Mode A`,
        value: `1 + SK::TraitB`,
      },
      {
        id: `12`, //
        name: `Mode B`,
        bonus: [`+1 to SK::TraitB`],
      },
    ],
  },
  {
    id: `2`,
    name: `TraitB`,
    level: 1,
  },
]

const manager = new ObjectManager()

for (const raw of rawObjects) {
  const object = manager.makeObject(raw.id)
  manager.applyStrategy(object.reference(`id`), DEFAULT_STRATEGY)

  manager.mutator.enqueue(object.reference(`id`), SET(`_.GCA`, raw))
}

manager.mutator.run()

debugger

/**
 * 1. Enqueue initialization
 *    SET "_.GCA"
 *
 * 2. Run mutator loop
 *    Effectively executes commands, i.e. set value inside "_.GCA" for object
 *    This will fire "cascadeUpdate" for each object at manager
 *
 * 2.5. Cascade Updates
 *    Get all changed properties after an update
 *    Fire listeners waiting for those properties, both inside object AND at manager ObjectMap
 *      OBJECT LEVEL x MANAGER LEVEL
 *
 */
