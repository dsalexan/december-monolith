import { set } from "lodash"
import { Strategy, Mutation, SET, OVERRIDE } from "@december/compiler"
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
      const mutations: Mutation[] = []
      const integrityEntries: IntegrityEntry[] = []

      const { info: _info, transforms: _transforms, damageTable: _damageTable } = object.data._.GCA as GCACharacter[`general`]

      const info: IGURPSCharacter[`general`][`info`] = _info
      mutations.push(SET(`info`, info))

      const transforms: IGURPSCharacter[`general`][`transforms`] = _transforms
      mutations.push(SET(`transforms`, transforms))

      const damageTable: DamageTable = {}
      for (const [level, damage] of Object.entries(_damageTable)) {
        const thr = Dice.d6(damage.thr.base).plus(damage.thr.modifier)
        const sw = Dice.d6(damage.sw.base).plus(damage.sw.modifier)

        damageTable[parseInt(level)] = { thr, sw }
      }

      // Trees should NEVER be saved within mutable context (we should generate an integrity entry for the tree, and save it as metadata)
      const entry = object.makeIntegrityEntry(`damageTable`, uuid())
      mutations.push(...object.storeMetadata(damageTable, `damageTable`, [entry]))
      integrityEntries.push(entry)

      return { mutations, integrityEntries }
    },
  )
