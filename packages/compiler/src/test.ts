import ObjectManager from "./manager"
import { SET } from "./mutation"
import MutableObject from "./object"
import { DEFAULT_STRATEGY } from "./GCA"

const rawObjects = [
  {
    id: `1`,
    name: `TraitA`,
    modes: [
      {
        id: `11`, //
        name: `Mode A`,
        value: `1 + TR:Dos`,
      },
      {
        id: `12`, //
        name: `Mode B`,
        bonus: [
          {
            target: `TR:Dos`,
            affects: `level`,
            value: `1`,
          },
        ],
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
  const object = manager.makeObject(raw.id) // create object
  manager.applyStrategy(object.reference(`id`), DEFAULT_STRATEGY) // assign strategy
  object.update([SET(`_.GCA`, raw)]) // initialize data

  // initialize alternative source of data
  if (raw.id === `1`) object.update([SET(`_.INPUT`, { name: `ManualA` })])
}

manager.mutator.run()

const data = manager.objects.byID.get(`1`)!.data
console.log(JSON.stringify(data, null, 2))

const data2 = manager.objects.byID.get(`2`)!.data
console.log(JSON.stringify(data2, null, 2))

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
