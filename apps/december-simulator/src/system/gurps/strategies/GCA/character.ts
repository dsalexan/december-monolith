import { v4 as uuidv4 } from "uuid"

import { set } from "lodash"
import { Strategy, Mutation, Signature, SET, OVERRIDE, setupMetadata } from "@december/compiler"
import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, Reference } from "@december/utils/access"
import { GCACharacter } from "@december/gca"
import { IGURPSCharacter } from "@december/gurps"
import { DamageTable } from "@december/gurps/character"
import { Dice } from "@december/system"

export const IMPORT_CHARACTER_FROM_GCA_STRATEGY = new Strategy() //
  .onUpdatePropertyMutatingFunction(
    [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA`)], //
    `GCA:initialize`,
    (object, strategy) =>
      ({ manager: character }) => {
        const instructions: Mutation[] = []

        const { info: _info, transforms: _transforms, damageTable: _damageTable } = object.data._.GCA as GCACharacter[`general`]

        const info: IGURPSCharacter[`general`][`info`] = _info
        instructions.push(SET(`info`, info))

        const transforms: IGURPSCharacter[`general`][`transforms`] = _transforms
        instructions.push(SET(`transforms`, transforms))

        const damageTable: DamageTable = {}
        for (const [level, damage] of Object.entries(_damageTable)) {
          const thr = Dice.d6(damage.thr.base, damage.thr.modifier)
          const sw = Dice.d6(damage.sw.base, damage.sw.modifier)

          damageTable[parseInt(level)] = { thr, sw }
        }

        // Trees should NEVER be saved within mutable context (we should generate a signature for the tree, and save it as metadata)
        instructions.push(...setupMetadata(object, `damageTable`, damageTable))

        return instructions
      },
  )
