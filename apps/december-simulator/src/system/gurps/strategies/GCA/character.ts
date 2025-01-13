import { set } from "lodash"
import { Strategy, Mutation, SET, OVERRIDE, MutationInput } from "@december/compiler"
import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, Reference } from "@december/utils/access"

import uuid from "@december/utils/uuid"
import { Dice } from "@december/system"
import { IGURPSCharacter } from "@december/gurps"
import { DamageTable } from "@december/gurps/character"

import { GCACharacter } from "@december/gca"

export const IMPORT_CHARACTER_FROM_GCA_STRATEGY = new Strategy() //
  .onPropertyUpdatedEnqueue(
    [PROPERTY(PLACEHOLDER_SELF_REFERENCE, `_.GCA`)], //
    `GCA:initialize`,
    object => {
      const output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

      const gca = object.data._.GCA as GCACharacter[`data`]

      // 1. Build general object
      const general: Omit<IGURPSCharacter, `damageTable`> = {
        name: gca.name,
        info: gca.info,
        transforms: gca.transforms,
        //
        encumbranceLevel: 0, // TODO:: create strategy to calculate this from equipment carried
        equipmentCost: 0, // TODO: create strategy to calculate this from equipment carried
        currentLoad: 0, // TODO: create strategy to calculate this from equipment carried
        //
        campaign: {
          totalMoney: gca.campaign.totalMoney,
        },
      }

      // 2. Build Damage Table
      const damageTable: DamageTable = {}
      for (const [level, damage] of Object.entries(gca.damageTable)) {
        const thr = Dice.d6(damage.thr.base).plus(damage.thr.modifier)
        const sw = Dice.d6(damage.sw.base).plus(damage.sw.modifier)

        damageTable[parseInt(level)] = { thr, sw }
      }

      //     Trees should NEVER be saved within mutable context (we should generate an integrity entry for the tree, and save it as metadata)
      const entry = object.makeIntegrityEntry(`damageTable`, uuid())
      output.mutations.push(...object.storeMetadata(damageTable, `damageTable`, [entry]))
      output.integrityEntries.push(entry)

      // 3. Push object structure as mutations
      for (const [key, value] of Object.entries(general)) output.mutations.push(SET(key, value))

      return { ...output }
    },
  )
