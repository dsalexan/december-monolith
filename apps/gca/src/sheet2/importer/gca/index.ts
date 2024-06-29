import { DamageTable } from "./../../character/schema"
import { keys, omit, pick, range, values } from "lodash"

import { Builder, ILogger, paint } from "@december/logger"

import { RawCharacter } from "../../character/schema"
import { CharacterImportStrategy, CharacterImportStrategyReturn } from "../strategy"

import { ListImport } from "../utils"
import TraitImport from "./trait"
import { ImportWarning, WarningCluster } from "../warnings"
import { Dice } from "../../../dice/index"
import { RawTrait } from "../../trait/schema"

function GCACharacterImporterStrategy(content: any, logger: Builder): CharacterImportStrategyReturn {
  const { gca5 } = content
  const { character } = gca5

  const { name, player, bodytype, vitals, currenttransform } = character[0]
  const { traits: _traits, transforms, basicdamages } = character[0]

  const _character: RawCharacter = {
    player: player[0],
    name: name[0],
    body: bodytype[0],
    vitals: {
      race: vitals[0][`race`][0],
      height: vitals[0][`height`][0],
      weight: vitals[0][`weight`][0],
      age: parseInt(vitals[0][`age`][0]),
      appearance: vitals[0][`appearance`][0],
    },
    //
    transforms: {
      current: currenttransform[0],
      list: transforms[0].transform.map((transform: any) => ({
        name: transform.name[0],
        points: parseInt(transform.points[0]),
        items: transform.items[0].item.map((item: any) => ({
          id: parseInt(item.$.idkey),
          name: item.name[0],
        })),
      })),
    },
    //
    damageTable: DamageTableImport(basicdamages[0].basicdamage),
  }

  // const allTraits = Object.fromEntries(keys(_traits).map(key => [key, _traits[key][0].trait]))

  const traits = {
    general: values(omit(_traits[0], `attributes`))
      .map(traits => traits[0].trait)
      .flat()
      .filter(t => !!t)
      .filter(trait => {
        // match regex if trait.name[0] is juat dashes
        const isJustDashes = /^-+$/.test(trait.name[0])

        return !isJustDashes
      }),
    attributes: _traits[0].attributes[0].trait as any[],
  }

  const warnings = new WarningCluster()

  logger.add(paint.bold(`---`)).debug() // COMMENT
  logger.add(paint.white.bold(`GENERAL TRAITS`), paint.grey(` (${traits.general.length})`)).debug() // COMMENT
  logger.tab() // COMMENT
  const { data: general, warnings: generalWarnings } = ListImport(traits.general, TraitImport, { logger, parent: _character })

  logger.tab(-1) // COMMENT

  logger.add(paint.bold(`---`)).debug() // COMMENT
  logger.add(paint.white.bold(`ATTRIBUTE TRAITS`), paint.grey(` (${traits.attributes.length})`)).debug() // COMMENT
  logger.tab() // COMMENT
  const { data: attributes, warnings: attributeWarnings } = ListImport(traits.attributes, TraitImport, { logger, parent: _character })
  logger.tab(-1) // COMMENT

  // store and print warnings
  warnings.extract(generalWarnings).extract(attributeWarnings)
  warnings.print(logger)

  const stats = Object.fromEntries(attributes.map(trait => [trait.id, trait])) as Record<string, RawTrait>

  return {
    character: _character,
    traits: Object.fromEntries(general.map(trait => [trait.id, trait])),
    stats,
  }
}

function DamageTableImport(basicdamages: any[]): DamageTable {
  const table: DamageTable = {}

  for (const row of basicdamages) {
    const st = parseInt(row.st[0])

    if (st === 0) {
      // TODO: Implement calculable damage ST
      continue
    }

    const thr = Dice.d6(parseInt(row.thbase[0]), parseInt(row.thadd[0]))
    const sw = Dice.d6(parseInt(row.swbase[0]), parseInt(row.swadd[0]))

    table[st] = { thr, sw }
  }

  // Check if all STs are present (1-20)
  for (let i of range(0, 20 + 1)) {
    if (i === 0) continue

    if (table[i] === undefined) throw new Error(`Damage table is not continuous`)
  }

  return table
}

export default GCACharacterImporterStrategy as CharacterImportStrategy
