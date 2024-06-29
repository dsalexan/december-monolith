import CharacterSheet from ".."
import { Trait } from "./schema"

export function setup(character: CharacterSheet, trait: Trait) {
  // setup metadata
  trait._ = {
    calculated: {
      syslevels: trait.level ?? 0,
    },
  }
}

export function calculate(character: CharacterSheet, trait: Trait) {}
