import CharacterSheet from ".."
import { Gives } from "../importer/modifiers"
import { Trait } from "./schema"

export default function give(character: CharacterSheet, trait: Trait) {
  const _gives = trait.modifiers?.flatMap(modifier => modifier.gives ?? []) ?? []

  for (const gives of _gives) {
    const targetTrait = getTargetTrait(character, gives)
    const bonus = calculateBonus(gives)

    if (targetTrait) {
      targetTrait._.calculated.syslevels! += bonus
    } else {
      // ERROR: Unimplemented, untested, unhandled
      debugger
    }
  }
}

function getTargetTrait(character: CharacterSheet, gives: Gives) {
  const [tag, traitName] = gives.trait.split(`:`)
  const targetTrait = character.getTrait(tag, traitName)

  return targetTrait
}

function calculateBonus(gives: Gives) {
  const bonus = parseInt(gives.bonus.toString())
  if (isNaN(bonus)) debugger

  return bonus
}
