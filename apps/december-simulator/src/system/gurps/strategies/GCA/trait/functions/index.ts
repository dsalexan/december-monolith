import assert from "assert"
import { isNil } from "lodash"

import { mergeMutationInput, MutableObject, MutationInput, SET } from "@december/compiler"

import { IGURPSBaseTrait, IGURPSGeneralTrait, IGURPSTraitOrModifier } from "@december/gurps/trait"

import { GCAGeneralTrait, GCATrait } from "@december/gca"

import { RuntimeIGURPSBaseTrait, RuntimeIGURPSTrait } from "../runtime"

import { GCAInitialize_BaseTrait, GCAInitialize_TraitOrModifier } from "./base"
import { GCAInitialize_Attribute } from "./attribute"
import { GCAInitialize_SkillOrSpellOrTechnique } from "./skill"
import { GCAInitialize_Equipment } from "./equipment"
import { GCAInitialize_GeneralTrait } from "./general"

export function GCAInitialize(object: MutableObject): MutationInput {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  const gcaTrait = object.data._.GCA as GCATrait

  // 1. Parse traits through all "layers"
  const { traitOrModifier, ...output1 } = GCAInitialize_TraitOrModifier(object.id, gcaTrait)
  output = mergeMutationInput(output, output1)

  assert(traitOrModifier.type !== `modifier`, `GCA trait must be a trait, not a modifier`)
  const { baseTrait, ...output2 } = GCAInitialize_BaseTrait(object, gcaTrait, traitOrModifier as IGURPSTraitOrModifier<IGURPSBaseTrait[`type`]>)
  output = mergeMutationInput(output, output2)

  let trait: RuntimeIGURPSTrait = baseTrait as any

  // if (object.id === `11182`) debugger // Carry something trait
  // if (object.id === `11233`) debugger // ST:Lifting ST
  // if (object.id === `11301`) debugger // ST:ST
  // if (object.id === `12984`) debugger // AD:Deflection

  // 2. Parse specifics
  if (baseTrait.type === `attribute` && gcaTrait.section === `attributes`) {
    const { trait: attribute, ...output3 } = GCAInitialize_Attribute(object, gcaTrait, baseTrait as RuntimeIGURPSBaseTrait<`attribute`>)
    output = mergeMutationInput(output, output3)

    trait = attribute
  } else if ((baseTrait.type === `skill` && gcaTrait.section === `skills`) || (baseTrait.type === `spell` && gcaTrait.section === `spells`)) {
    const { trait: skill, ...output3 } = GCAInitialize_SkillOrSpellOrTechnique(object, gcaTrait, baseTrait as RuntimeIGURPSBaseTrait<`skill` | `spell` | `technique`>)
    output = mergeMutationInput(output, output3)

    trait = skill
  } else if (baseTrait.type === `equipment` && gcaTrait.section === `equipment`) {
    const { trait: equipment, ...output3 } = GCAInitialize_Equipment(object, gcaTrait, baseTrait as RuntimeIGURPSBaseTrait<`equipment`>)
    output = mergeMutationInput(output, output3)

    trait = equipment
  } else {
    const { trait: generalTrait, ...output3 } = GCAInitialize_GeneralTrait(object, gcaTrait as GCAGeneralTrait, baseTrait as RuntimeIGURPSBaseTrait<IGURPSGeneralTrait[`type`]>)
    output = mergeMutationInput(output, output3)

    trait = generalTrait
  }

  // 3. Append object structure as mutations
  const mutations: MutationInput[`mutations`] = []
  for (const [key, value] of Object.entries(trait)) mutations.push(SET(key, value))
  output.mutations.unshift(...mutations)

  return output
}
