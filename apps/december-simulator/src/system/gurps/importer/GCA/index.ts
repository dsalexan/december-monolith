import fs from "fs"

import { readXMLFile } from "@december/utils/file"

import BaseCharacter from "../../../../character"
import GenericImporter from "../../../../importer"
import logger, { Builder, paint } from "../../../../logger"
import { AnyObject } from "tsdef"
import GURPSCharacter, { CharacterData, DamageTable } from "../../character"
import { range } from "lodash"
import { D6 } from "../../../../units"
import { Gardener, NodeFactory } from "../../../../tree"

import * as Dice from "../../../../dice"

export default class GCAImporter extends GenericImporter {
  character: GURPSCharacter

  get manager() {
    return this.character.manager
  }

  constructor(logger: Builder) {
    super(logger)
  }

  override async import(filepath: string, character: GURPSCharacter) {
    this.character = character
    const content = await readXMLFile(filepath)

    character.name = content.gca5.character[0].name[0]

    this.logger.add(...paint.grey(``, `[Importing] `, paint.white.bold(character.name), ` from "${filepath}"`)).debug()
    // this.logger.t.add(paint.grey.italic(`strategy: `), strategy.name).debug()

    fs.writeFileSync(`./test.json`, JSON.stringify(content, null, 2), `utf-8`) // COMMENT

    const characterData = this.characterData(content)

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
}
