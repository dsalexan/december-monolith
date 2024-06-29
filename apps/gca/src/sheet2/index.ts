import fs from "fs"
import xml2js from "xml2js"

import { CompilationManager, ReactiveCompilableObject, Instruction, ReactiveCompilationManager } from "@december/compile"
import { Builder, paint } from "@december/logger"

import { CharacterImportStrategy } from "./importer"
import { Character, RawCharacter } from "./character/schema"
import { keys, omit, uniq } from "lodash"
import { Metadata } from "./schema"

import CharacterReactiveStrategy from "./character/strategy"
import TraitReactiveStrategy from "./trait/strategy"
import { RawTrait, Trait } from "./trait/schema/raw"

async function readXMLFile(path: string): Promise<unknown> {
  const content = fs.readFileSync(path, `utf8`)

  const parser = new xml2js.Parser(/* options */)
  const json = await parser.parseStringPromise(content)

  return json
}

export default class CharacterSheet extends ReactiveCompilationManager {
  constructor(logger: Builder) {
    super(logger)
  }

  get character() {
    return this.objects[`character`] as ReactiveCompilableObject<Character>
  }

  get stats() {
    return (this.getObjects(`stats`) ?? []) as ReactiveCompilableObject<Trait & Metadata<RawTrait>>[]
  }

  get traits() {
    return (this.getObjects(`traits`) ?? []) as ReactiveCompilableObject<Trait & Metadata<RawTrait>>[]
  }

  async import(filepath: string, strategy: CharacterImportStrategy) {
    const content = (await readXMLFile(filepath)) as any

    const name = content.gca5.character[0].name[0]

    this.logger.add(...paint.grey(``, `[Importing] `, paint.white.bold(name), ` from "${filepath}"`)).debug()
    this.logger.t.add(paint.grey.italic(`strategy: `), strategy.name).debug()

    fs.writeFileSync(`./test.json`, JSON.stringify(content, null, 2), `utf-8`) // DEBUG

    // parse from file into raw objects
    const rawObjects = strategy(content, this.logger)
    const _keys = keys(rawObjects) as (keyof typeof rawObjects)[]

    this.logger.add(paint.bold(`---`)).debug() // COMMENT
    this.logger.add(paint.white.bold(`PREPARE COMPILING`)).debug() // COMMENT

    // insert raw data into compilable objects
    this.logger.tab()
    for (const key of _keys) {
      const rawObject = rawObjects[key]

      if (key === `character`) {
        const rawCharacter = rawObject as RawCharacter

        // this.logger.add(paint.grey(`${key} `), paint.bold(key), paint.blue(` CharacterReactiveStrategy`)).debug()

        const character = ReactiveCompilableObject.make<Metadata>(`character`, { _: {} }) //
          .addStrategy(CharacterReactiveStrategy)
          .addToManager(this, undefined, this.logger)
          .set(`_.raw`, rawCharacter)
      } else if (key === `traits` || key === `stats`) {
        const traitIds = keys(rawObject) as string[]

        // check if there are repeating ids
        if (traitIds.length !== new Set(traitIds).size) {
          // this.logger.add(paint.red(`ERROR: Duplicate trait ids in raw object`)).debug()
          debugger
        }

        for (const traitId of traitIds) {
          const rawTrait = rawObject[traitId] as RawTrait

          // ignore if name is just dashes
          if (/-+/.test(rawTrait.name)) continue

          // if (![12899].includes(rawTrait.id)) continue
          if (![12899].includes(rawTrait.id) && key !== `stats`) continue

          // this.logger.add(paint.grey(`${key} `), paint.bold(traitId), paint.grey.italic(` (No strategy)`)).debug()

          const trait = ReactiveCompilableObject.make<Metadata>(traitId, { _: {} }) //
            .addStrategy(TraitReactiveStrategy)
            .addToManager(this, key, this.logger)
            .set(`_.raw`, rawTrait)
        }
      } else {
        // ERROR: Unimplemented raw key
        debugger
      }
    }
    this.logger.tab(-1)

    this.logger.add(paint.bold(`---`)).debug() // COMMENT

    // start reactive compilation
    this.compile()

    return this
  }
}
