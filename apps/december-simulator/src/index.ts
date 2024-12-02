import seedrandom from "seedrandom"
seedrandom(`hello.`, { global: true })

import path from "path"

import { GCACharacter, GCACharacterImporter } from "@december/gca"
import { makeArtificialEventTrace, SET } from "@december/compiler"

import churchil, { paint } from "./logger"
import { GURPSCharacter } from "./system/gurps"
import { IMPORT_CHARACTER_FROM_GCA_STRATEGY } from "./system/gurps/strategies/GCA/character"
import { IMPORT_TRAIT_FROM_GCA_STRATEGY } from "./system/gurps/strategies/GCA/trait"
import { makeArtificilEventDispatcher } from "../../../packages/compiler/src/controller/eventEmitter/event"

const importer = new GCACharacterImporter(churchil)

const GCA5 = `C:\\Users\\dsale\\Documents\\GURPS Character Assistant 5`
const pathfile = path.join(GCA5, `characters`, `Luke Undell (dsalexan).gca5`)

async function run() {
  // 1. Import character from GCA5 file
  const ImportEvent = makeArtificilEventDispatcher({ type: `import`, origin: { file: pathfile, type: `gca` } })
  // const ImportEvent = makeArtificialEventTrace({ type: `import`, origin: { file: pathfile, type: `gca` } })

  const GCA = new GCACharacter()
  await importer.import(pathfile, GCA)

  // 2. Setup character mutable object compilation
  churchil.add(paint.grey(`[setup] general + ${GCA.allTraits.length} traits`)).info()

  const character = new GURPSCharacter(GCA.id, GCA.name)

  const general = character.makeObject(`general`)
  character.tagObject(general, `general`)
  character.applyStrategy(general, IMPORT_CHARACTER_FROM_GCA_STRATEGY)
  character.frameRegistry.register(general.id, { name: `GCA:import`, fn: () => [SET(`_.GCA`, GCA.general)] })
  character.callQueue.enqueue(general.reference(), { eventDispatcher: ImportEvent, name: `GCA:import` })
  // general.update([SET(`_.GCA`, GCA.general)], [], ImportEvent)

  for (const { type, trait } of GCA.allTraits) {
    if (
      ![
        11290, // ST:Punch
        // 11178, // ST:Bite
        12899, // SK:Karate
      ].includes(trait.id)
    )
      continue

    const object = character.makeObject(trait.id.toString())
    character.tagObject(object, `${type}s`)
    character.applyStrategy(object, IMPORT_TRAIT_FROM_GCA_STRATEGY)
    character.frameRegistry.register(object.id, { name: `GCA:import`, fn: () => [SET(`_.GCA`, trait)] })
    character.callQueue.enqueue(object.reference(), { eventDispatcher: ImportEvent, name: `GCA:import` })
    // object.update([SET(`_.GCA`, trait)], [], ImportEvent)
  }

  // 3. Compile character
  character.callQueue.execute()

  const _general = character.general

  const punch = character.store.getByID(`11290`) // ST:Punch
  const bite = character.store.getByID(`11178`) // ST:Bite
  const karate = character.store.getByID(`12899`) // SK:Karate
  debugger
}

run()
