import assert from "assert"
import { AnyObject, NonNil, Nullable, WithOptionalKeys } from "tsdef"
import { get, isNil, isNumber, isString, set } from "lodash"

import { SELF_PROPERTY } from "@december/utils/access"
import { Mutation, Strategy, IntegrityEntry, SET, MutationInput, mergeMutationInput } from "@december/compiler"

import { GCAGeneralTrait, GCATrait } from "@december/gca"
import { IGURPSBaseTrait, IGURPSGeneralTrait, IGURPSTrait, IGURPSTraitOrModifier } from "@december/gurps/trait"

import logger, { Block, paint } from "../../../../../logger"
import { parseAttribute, parseBaseTrait, parseEquipment, parseGeneralTrait, parseSkillOrSpellOrTechnique, parseTraitOrModifier, RuntimeIGURPSTrait } from "./parsers"

export const IMPORT_TRAIT_FROM_GCA_STRATEGY = new Strategy()

// A. IMPORT FROM GCA
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`_.GCA`)], //
  `GCA:initialize`,
  (object, { executionContext }) => {
    let output: MutationInput = { mutations: [], integrityEntries: [] }

    const gcaTrait = object.data._.GCA as GCATrait

    // 1. Parse traits through all "layers"
    const { traitOrModifier, ...output1 } = parseTraitOrModifier(gcaTrait)
    output = mergeMutationInput(output, output1)

    assert(traitOrModifier.type !== `modifier`, `GCA trait must be a trait, not a modifier`)
    const { baseTrait, ...output2 } = parseBaseTrait(gcaTrait, traitOrModifier as IGURPSTraitOrModifier<IGURPSBaseTrait[`type`]>)
    output = mergeMutationInput(output, output2)

    let trait: RuntimeIGURPSTrait = baseTrait as any

    // 3. Parse specifics
    if (baseTrait.type === `attribute` && gcaTrait.section === `attributes`) {
      const { trait: attribute, ...output3 } = parseAttribute(gcaTrait, baseTrait as IGURPSBaseTrait<`attribute`>)
      output = mergeMutationInput(output, output3)

      trait = attribute
    } else if ((baseTrait.type === `skill` && gcaTrait.section === `skills`) || (baseTrait.type === `spell` && gcaTrait.section === `spells`)) {
      const { trait: skill, ...output3 } = parseSkillOrSpellOrTechnique(gcaTrait, baseTrait as IGURPSBaseTrait<`skill` | `spell`>)
      output = mergeMutationInput(output, output3)

      trait = skill
    } else if (baseTrait.type === `equipment` && gcaTrait.section === `equipment`) {
      const { trait: equipment, ...output3 } = parseEquipment(gcaTrait, baseTrait as IGURPSBaseTrait<`equipment`>)
      output = mergeMutationInput(output, output3)

      trait = equipment
    } else {
      const { trait, ...output3 } = parseGeneralTrait(gcaTrait as GCAGeneralTrait, baseTrait as IGURPSBaseTrait<IGURPSGeneralTrait[`type`]>)
      output = mergeMutationInput(output, output3)
    }
    //
    // else throw new Error(`Trait type "${baseTrait.type}" not supported`)

    // 2. Push object structure as mutations
    for (const [key, value] of Object.entries(trait)) output.mutations.push(SET(key, value))

    return output
  },
)
