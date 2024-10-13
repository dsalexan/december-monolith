import path from "path"

import { GCACharacter, GCACharacterImporter } from "@december/gca"
import { SET } from "@december/compiler"

import churchil from "./logger"
import { GURPSCharacter } from "./system/gurps"
import { IMPORT_CHARACTER_FROM_GCA_STRATEGY } from "./system/gurps/strategies/GCA/character"
import { IMPORT_TRAIT_FROM_GCA_STRATEGY } from "./system/gurps/strategies/GCA/trait"

const importer = new GCACharacterImporter(churchil)

const GCA5 = `C:\\Users\\dsale\\Documents\\GURPS Character Assistant 5`
const pathfile = path.join(GCA5, `characters`, `Luke Undell (dsalexan).gca5`)

async function run() {
  // 1. Import character from GCA5 file
  const GCA = new GCACharacter()
  await importer.import(pathfile, GCA)

  // 2. Setup character mutable object compilation
  const character = new GURPSCharacter(GCA.id, GCA.name)

  const general = character.makeObject(`general`)
  character.indexObject(general, `general`)
  character.applyStrategy(general.reference(`id`), IMPORT_CHARACTER_FROM_GCA_STRATEGY)
  general.update([SET(`_.GCA`, GCA.general)])

  for (const { type, trait } of GCA.allTraits) {
    if (
      ![
        11178, // ST:Bite
        12899, // SK:Karate
      ].includes(trait.id)
    )
      continue

    const object = character.makeObject(trait.id.toString())
    character.indexObject(object, `${type}s`)
    character.applyStrategy(object.reference(`id`), IMPORT_TRAIT_FROM_GCA_STRATEGY)
    object.update([SET(`_.GCA`, trait)])
  }

  // 3. Compile character
  character.mutator.run()

  const _general = character.general
  debugger
}

run()
