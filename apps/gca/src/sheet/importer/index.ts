import { EventEmitter } from "@billjs/event-emitter"
import CharacterSheet from ".."
import path from "path"
import fs from "fs"
import { XMLParser, XMLBuilder, XMLValidator } from "fast-xml-parser"
import xml2js from "xml2js"
import { CharacterData } from "../base"
import { pick, values } from "lodash"
import { isNilOrEmpty } from "../../../../../packages/utils/src"
import { Node } from "../../tree/node"
import { TraitParser } from "../../trait/parser"
import { SYNTAX_COMPONENTS } from "../../trait/parser/syntax"
import parseGCA5Modifier from "./modifiers"
import { Trait } from "../trait"

export default class GCAImporter extends EventEmitter {
  target!: CharacterSheet

  constructor() {
    super()
  }

  async import(target: CharacterSheet, path: string) {
    this.target = target

    const data = await this._import(path)

    this.target.setData(data)
  }

  async _import(path: string) {
    const content = fs.readFileSync(path, `utf8`)

    const parser = new xml2js.Parser(/* options */)
    const result = await parser.parseStringPromise(content)

    fs.writeFileSync(`./test.json`, JSON.stringify(result, null, 2), `utf-8`)

    const { gca5 } = result
    const { character } = gca5

    const { name, player, bodytype, vitals, currenttransform } = character[0]

    const { traits, transforms } = character[0]

    const _traits = values(traits[0])
      .map(traits => traits[0].trait)
      .flat()
      .filter(t => !!t)

    debugger
    const data = {} as any

    // const data: CharacterData = {
    //   player: player[0],
    //   name: name[0],
    //   body: bodytype[0],
    //   vitals: {
    //     race: vitals[0][`race`][0],
    //     height: vitals[0][`height`][0],
    //     weight: vitals[0][`weight`][0],
    //     age: parseInt(vitals[0][`age`][0]),
    //     appearance: vitals[0][`appearance`][0],
    //   },
    //   transforms: {
    //     current: currenttransform[0],
    //     list: transforms[0].transform.map((transform: any) => ({
    //       name: transform.name[0],
    //       points: parseInt(transform.points[0]),
    //       items: transform.items[0].item.map((item: any) => ({
    //         id: parseInt(item.$.idkey),
    //         name: item.name[0],
    //       })),
    //     })),
    //   },
    //   //
    //   traits: Object.fromEntries(
    //     _traits.map((_trait: any) => {
    //       const id = parseInt(_trait.$.idkey)

    //       const _modifiers = _trait.modifiers?.[0].modifier.filter((modifier: any) => modifier.name[0] !== ``)
    //       const _modes = _trait.attackmodes?.[0].attackmode.filter((mode: any) => mode.name[0] !== ``)

    //       let level = _trait.level?.[0]
    //       if (level !== undefined) level = parseInt(level)

    //       const trait: Trait = {
    //         _: _trait,
    //         _calculated: { syslevels: 0 },
    //         id,
    //         name: _trait.name[0],
    //         type: _trait.$.type,
    //         level,
    //       }

    //       if (_modifiers && _modifiers.length) trait.modifiers = _modifiers.map((_modifier: any) => parseGCA5Modifier(_modifier))

    //       if (_modes && _modes.length)
    //         trait.modes = _modes.map((attackmode: any) => {
    //           const mode = {} as any

    //           set(mode, `name`, attackmode.name?.[0])
    //           set(mode, `reachbasedon`, attackmode.reachbasedon?.[0])
    //           set(mode, `acc`, attackmode.acc?.[0])
    //           set(mode, `damage`, attackmode.damage?.[0])
    //           set(mode, `dmg`, attackmode.dmg?.[0])
    //           set(mode, `damtype`, attackmode.damtype?.[0])
    //           set(mode, `rangehalfdam`, attackmode.rangehalfdam?.[0])
    //           set(mode, `rangemax`, attackmode.rangemax?.[0])
    //           set(mode, `rcl`, attackmode.rcl?.[0])
    //           set(mode, `rof`, attackmode.rof?.[0])
    //           set(mode, `skillused`, attackmode.skillused?.[0])
    //           set(mode, `minimode_damage`, attackmode.minimode_damage?.[0])
    //           set(mode, `minimode_damtype`, attackmode.minimode_damtype?.[0])

    //           return mode
    //         })

    //       return [id, trait]
    //     }),
    //   ),
    // }

    return data
  }
}

function set(object: any, key: string, value: any) {
  if (value === undefined) return
  object[key] = value
}
