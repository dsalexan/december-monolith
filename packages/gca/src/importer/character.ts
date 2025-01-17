import fs from "fs"
import { omit, orderBy, range, values } from "lodash"
import { AnyObject, AnyObjectWithNumberKeys } from "tsdef"

import { readXMLFile } from "@december/utils/file"
import { ICharacterImporter, Dice } from "@december/system"

import churchill, { Builder, paint } from "../logger"

import GCACharacter, { DamageTable, CharacterGeneralData } from "../character"
import { importGCATrait } from "./trait"
import { GCAAttribute, GCATrait } from "../trait"

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
    character._raw = content

    this.logger.add(...paint.grey(``, `[GCA/Importing] `, paint.white.bold(content.gca5.character[0].name[0]), paint.dim(` (${character.id.substring(0, 5)})`), ` from "${filepath}"`)).debug() // COMMENT
    fs.writeFileSync(`./test.json`, JSON.stringify(content, null, 2), `utf-8`) // COMMENT

    // 2. Import stuff
    character.data = this.characterGeneralData(content)

    this.logger.tab() // COMMENT
    const { traits, stats } = this.traitsAndStats(content)
    this.logger.untab() // COMMENT

    character.traits = traits
    character.stats = stats
  }

  protected characterGeneralData(raw: AnyObject): CharacterGeneralData {
    const { gca5 } = raw
    const { character } = gca5

    const { name, player, bodytype, vitals, currenttransform, campaign } = character[0]
    const { traits: _traits, transforms, basicdamages } = character[0]

    // 1. Build Damage Table
    const damageTable: DamageTable = {}

    for (const row of basicdamages[0].basicdamage) {
      const st = parseInt(row.st[0])
      if (st === 0) continue // TODO: Implement calculable damage ST

      const thr = { base: parseInt(row.thbase[0]), modifier: parseInt(row.thadd[0]) }
      const sw = { base: parseInt(row.swbase[0]), modifier: parseInt(row.swadd[0]) }

      damageTable[st] = { thr, sw }
    }

    // 2. Check if all STs are present (1-20)
    for (let i of range(1, 20 + 1)) {
      if (i === 0) continue // TODO: Implement calculable damage ST
      if (damageTable[i] === undefined) throw new Error(`Damage table is not continuous`)
    }

    return {
      name: name[0],
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
      //
      campaign: {
        totalMoney: parseInt(campaign[0].totalmoney[0]),
      },
    }
  }

  protected traitsAndStats(raw: AnyObject) {
    const { gca5 } = raw
    const { character } = gca5

    const rawEntries: { traits: AnyObject[]; stats: AnyObject[] } = {
      traits: values(omit(character[0].traits[0], `attributes`))
        .map(traits => traits[0].trait)
        .flat()
        .filter(t => !!t),
      stats: character[0].traits[0].attributes[0].trait.filter(t => !!t),
    }

    const entries: {
      traits: GCATrait[]
      stats: GCAAttribute[]
    } = { traits: [], stats: [] }

    for (const [key, list] of Object.entries(rawEntries)) {
      for (const entry of list) {
        const name = entry.name[0]
        if (/^-+$/.test(name)) continue

        if (key === `stats`) {
          const attribute = importGCATrait(`attribute`, entry, this.logger) as GCAAttribute
          entries.stats.push(attribute)
        } else {
          const trait = importGCATrait(`trait`, entry, this.logger)
          entries.traits.push(trait)
        }
      }
    }

    // const all = { trait: _traits, attribute: _attributes }
    // for (const [key, list] of Object.entries(all)) {
    //   for (const raw of list) {
    //     if (/^-+$/.test(raw.name[0])) continue

    //     const trait = importGCATrait(key as any, raw, this.logger)

    //     if (key === `attribute`) stats.push(trait)
    //     else traits.push(trait)
    //   }
    // }

    const transformer = (traits: GCATrait[]) => {
      const sorted = orderBy(traits, t => t.id)

      const map: Record<string, GCATrait> = {}
      for (const trait of sorted) {
        if (map[trait.id]) throw new Error(`Trait ID "${trait.id}" already exists`)
        map[trait.id] = trait
      }

      return map
    }

    return { traits: transformer(entries.traits), stats: transformer(entries.stats) }
  }
}
