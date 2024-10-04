import fs from "fs"
import { omit, orderBy, range, values } from "lodash"
import { AnyObject } from "tsdef"

import { readXMLFile } from "@december/utils/file"
import { ICharacterImporter, Dice } from "@december/system"

import churchill, { Builder, paint } from "../logger"

import GCACharacter, { DamageTable, CharacterData } from "../character"
import { importGCATrait } from "./trait"
import { GCATrait } from "../trait"

export default class GCACharacterImporter implements ICharacterImporter {
  character: GCACharacter
  logger: Builder

  constructor(logger?: Builder) {
    this.logger = logger ?? churchill
  }

  async import(filepath: string, character: GCACharacter) {
    this.character = character
    const content = await readXMLFile(filepath)

    // 1. Set name
    character.name = content.gca5.character[0].name[0]

    this.logger.add(...paint.grey(``, `[GCA/Importing] `, paint.white.bold(character.name), paint.dim(` (${character.id.substring(0, 5)})`), ` from "${filepath}"`)).debug() // COMMENT
    fs.writeFileSync(`./test.json`, JSON.stringify(content, null, 2), `utf-8`) // COMMENT

    // 2. Import stuff
    character.data = this.characterData(content)

    this.logger.tab() // COMMENT
    const { traits, stats } = this.traitsAndStats(content)
    this.logger.untab() // COMMENT

    character.traits = traits
    character.stats = stats

    debugger
  }

  protected characterData(raw: AnyObject): CharacterData {
    const { gca5 } = raw
    const { character } = gca5

    const { name, player, bodytype, vitals, currenttransform } = character[0]
    const { traits: _traits, transforms, basicdamages } = character[0]

    // 1. Build Damage Table
    const damageTable: DamageTable = {}

    for (const row of basicdamages[0].basicdamage) {
      const st = parseInt(row.st[0])
      if (st === 0) continue // TODO: Implement calculable damage ST

      const thr = Dice.d6(parseInt(row.thbase[0]), parseInt(row.thadd[0]))
      const sw = Dice.d6(parseInt(row.swbase[0]), parseInt(row.swadd[0]))

      damageTable[st] = { thr, sw }
    }

    // 2. Check if all STs are present (1-20)
    for (let i of range(1, 20 + 1)) {
      if (i === 0) continue // TODO: Implement calculable damage ST
      if (damageTable[i] === undefined) throw new Error(`Damage table is not continuous`)
    }

    return {
      info: {
        player: player[0],
        body: bodytype[0],
        vitals: {
          race: vitals[0][`race`][0],
          height: vitals[0][`height`][0],
          weight: vitals[0][`weight`][0],
          age: parseInt(vitals[0][`age`][0]),
          appearance: vitals[0][`appearance`][0],
        },
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
      damageTable,
    }
  }

  protected traitsAndStats(raw: AnyObject) {
    const { gca5 } = raw
    const { character } = gca5

    const _traits = values(omit(character[0].traits[0], `attributes`))
      .map(traits => traits[0].trait)
      .flat()
      .filter(t => !!t)
    const _attributes = character[0].traits[0].attributes[0].trait.filter(t => !!t)

    let traits: GCATrait[] = [],
      stats: GCATrait[] = []

    const all = { trait: _traits, attribute: _attributes }
    for (const [key, list] of Object.entries(all)) {
      for (const raw of list) {
        if (/^-+$/.test(raw.name[0])) continue

        const trait = importGCATrait(key as any, raw, this.logger)

        if (key === `attribute`) stats.push(trait)
        else traits.push(trait)
      }
    }

    const transformer = (traits: GCATrait[]) => {
      const sorted = orderBy(traits, t => t.id)

      const map: Record<string, GCATrait> = {}
      for (const trait of sorted) map[trait.name] = trait

      return map
    }

    return { traits: transformer(traits), stats: transformer(stats) }
  }
}
