import seedrandom from "seedrandom"
seedrandom(`hello.`, { global: true })

import path from "path"

import { dump } from "@december/utils"
import { GCAAttribute, GCACharacter, GCACharacterImporter } from "@december/gca"
import { makeArtificialEventTrace, MutableObject, SET } from "@december/compiler"

import churchil, { Block, Paint, paint } from "./logger"
import { GURPSCharacter } from "./system/gurps"
import { IMPORT_CHARACTER_FROM_GCA_STRATEGY } from "./system/gurps/strategies/GCA/character"
import { IMPORT_TRAIT_FROM_GCA_STRATEGY } from "./system/gurps/strategies/GCA/trait"
import { makeArtificilEventDispatcher } from "../../../packages/compiler/src/controller/eventEmitter/event"
import { fullName, IGURPSGeneralTrait, IGURPSTrait } from "../../../packages/gurps/src/trait"
import { RuntimeIGURPSAttribute, RuntimeIGURPSGeneralTrait, RuntimeIGURPSTrait } from "./system/gurps/strategies/GCA/trait/parsers"
import { GCABase, GCABaseNonSkillNonSpellNonEquipment, GCABaseTrait, GCABaseTraitPointBased } from "../../../packages/gca/src/trait"
import { DiffObjects } from "tsdef"
import { get, isArray, isBoolean, isNumber, isObject, isString, range } from "lodash"
import { isPrimitive } from "../../../packages/utils/src/typing"
import { BooleanValue, NumericValue, RuntimeValue, StringValue } from "../../../packages/tree/src/interpreter"
import assert from "assert"

const importer = new GCACharacterImporter(churchil)

const GCA5 = `C:\\Users\\dsale\\Documents\\GURPS Character Assistant 5`
const pathfile = path.join(GCA5, `characters`, `Luke Undell (dsalexan).gca5`)

async function run() {
  // 1. Import character from GCA5 file
  const ImportEvent = makeArtificilEventDispatcher({ type: `import`, origin: { file: pathfile, type: `gca` } })
  // const ImportEvent = makeArtificialEventTrace({ type: `import`, origin: { file: pathfile, type: `gca` } })

  const GCA = new GCACharacter()
  await importer.import(pathfile, GCA)

  // 2. Setup character mutable object compilation
  churchil.add(paint.grey(`[setup] general + ${GCA.allTraits.length} traits`)).info()

  const character = new GURPSCharacter(GCA.id, GCA.data.name)

  const data = character.makeObject(`data`)
  character.tagObject(data, `data`)
  character.applyStrategy(data, IMPORT_CHARACTER_FROM_GCA_STRATEGY)
  character.frameRegistry.register(data.id, { name: `GCA:import`, fn: () => [SET(`_.GCA`, GCA.data)] })
  character.callQueue.enqueue(data.reference(), { eventDispatcher: ImportEvent, name: `GCA:import` })
  // data.update([SET(`_.GCA`, GCA.data)], [], ImportEvent)

  //

  const existsBasicAirMove = GCA.allTraits.find(({ trait }) => trait.name === `Basic Air Move`)
  if (!existsBasicAirMove) {
    const base: GCABase<`attributes`> = {
      _raw: {},
      section: `attributes`,
      id: 0,
      //
      conditional: undefined,
      description: undefined,
      displayNameFormula: undefined,
      displayScoreFormula: undefined,
      gives: undefined,
      group: undefined,
      mods: undefined,
      name: `Basic Air Move`,
      nameExt: undefined,
      page: undefined,
      //
      childKeyList: undefined,
      _inactive: false,
    }

    const baseTrait: GCABaseTrait<`attributes`> = {
      ...base,
      //
      // parent-traits
      childProfile: undefined, // ChildProfile()
      // system-traits
      displayCost: undefined, // DisplayCost()
      displayName: undefined, // DisplayName()
      // traits-with-damage-modes
      modes: [],
      //
      // section: Exclude<TraitSection, `modifiers`> & TSection
      //
      blockAt: undefined, // BlockAt()
      countCapacity: undefined, // CountCapacity()
      db: undefined, // DB()
      dr: undefined, // DR()
      drNotes: undefined, // DRNotes()
      hide: undefined, // Hide()
      hideMe: undefined, // HideMe()
      itemNotes: undefined, // ItemNotes()
      needs: undefined, // Needs()
      parryAt: undefined, // ParryAt()
      skillUsed: undefined, // SkillUsed()
      taboo: undefined, // Taboo()
      tl: undefined, // TL()
      units: undefined, // Units()
      upTo: undefined, // UpTo()
      userNotes: undefined, // UserNotes()
      uses: undefined, // Uses()
      vars: undefined, // Vars()
      weightCapacity: undefined, // WeightCapacity()
      weightCapacityUnits: undefined, // WeightCapacityUnits()
      //
      modifiers: [], // Modifiers()
      //
      _sysLevels: undefined, // calcs.syslevels; levels from bonuses, not FREE levels from system
      _level: undefined,
    }

    const baseNonSkillNonEquipment: DiffObjects<GCABaseNonSkillNonSpellNonEquipment, GCABase> = {
      levelNames: undefined, // LevelNames()
    }

    const baseTraitPointBased: DiffObjects<GCABaseTraitPointBased, GCABaseTrait> = {
      basePoints: 0, // calcs.basepoints
      childPoints: undefined, // calcs.childpoints
    }

    const trait: GCAAttribute = {
      ...baseTrait,
      ...baseNonSkillNonEquipment,
      ...baseTraitPointBased,
      //
      baseValue: `ST:Basic Move * 2`, // BaseValue(); source of baseScore, be that numeric or alias or expression
      display: undefined, // Display()
      down: undefined, // Down()
      downFormula: undefined, // DownFormula()
      maxScore: undefined, // MaxScore()
      minScore: undefined, // MinScore()
      round: undefined, // Round()
      step: undefined, // Step()
      symbol: undefined, // Symbol()
      up: undefined, // Up()
      //
      _baseScore: undefined, // calcs.basescore; !fetch value from baseValue instead of using this
      _score: undefined, // calcs.score; !calculate from baseScore + sysLevels + modifiers maybe
    }

    const object = character.makeObject(`c${trait.id}`)
    character.tagObject(object, `stats`)
    character.applyStrategy(object, IMPORT_TRAIT_FROM_GCA_STRATEGY)
    character.frameRegistry.register(object.id, { name: `GCA:import`, fn: () => [SET(`_.GCA`, trait)] })
    character.callQueue.enqueue(object.reference(), { eventDispatcher: ImportEvent, name: `GCA:import` })
  }
  //

  for (const { type, trait } of GCA.allTraits) {
    // if (
    //   ![
    //     // 11290, // ST:Punch
    //     // 11178, // ST:Bite
    //     // 12899, // SK:Karate
    //     // 11193, // ST:DX
    //     12971, // Acute Taste and Smell 1
    //     // 13006, // Acute Taste and Smell 8
    //   ].includes(trait.id)
    // )
    //   continue

    if (type !== `stat`) {
      if (trait.section !== `skills`) continue
    }

    const object = character.makeObject(trait.id.toString())
    character.tagObject(object, `${type}s`)
    character.applyStrategy(object, IMPORT_TRAIT_FROM_GCA_STRATEGY)
    character.frameRegistry.register(object.id, { name: `GCA:import`, fn: () => [SET(`_.GCA`, trait)] })
    character.callQueue.enqueue(object.reference(), { eventDispatcher: ImportEvent, name: `GCA:import` })
    // object.update([SET(`_.GCA`, trait)], [], ImportEvent)
  }

  // 3. Compile character
  character.callQueue.execute()

  const _data = character.data

  const punch = character.store.getByID(`11290`) // ST:Punch
  const bite = character.store.getByID(`11178`) // ST:Bite
  const karate = character.store.getByID(`12899`) // SK:Karate
  const acuteTasteAndSmell = character.store.getByID<MutableObject<RuntimeIGURPSGeneralTrait>>(`12971`) // // AD:Acute Taste and Smell
  const DX = character.store.getByID<MutableObject<RuntimeIGURPSAttribute>>(`11193`) // ST:DX

  const _DX = DX?.getData()

  // const modifierValue = acuteTasteAndSmell?.getProperty(`modifiers.0.modifier.value`)
  const modifierType = DX?.getProperty(`modifiers.0.modifier.type`)
  const modifierValue = DX?.getProperty(`modifiers.0.modifier.value`)

  // const stuff = punch?.getProperty(`modes.[${0}].damage.value`)

  // console.log(`\n${`=`.repeat(250)}\n`)
  // churchil.addRow(`debug`, ...dump(acuteTasteAndSmell!.data._.GCA._raw))

  for (const attribute of character.stats) explainTrait(attribute as any)
  for (const trait of character.traits) {
    if (trait.data.type !== `skill`) continue
    explainTrait(trait as any)
  }
}

run()

function explainTrait(trait: MutableObject<RuntimeIGURPSTrait>) {
  const data = trait.getData()

  // 1. Choose paths
  let paths: { path: string; check?: string; filter?: (item: any, key: string) => boolean }[] = []
  if (data.type === `attribute`) {
    paths.push({ path: `score.base.initial` }, { path: `score.base.value` }, { path: `score.value`, check: `_.GCA._score` })
  } else if (data.type === `skill`) {
    paths.push(
      { path: `level.bought` },
      { path: `level.default` },
      {
        path: `level.defaults`, //
        filter: (item: any, key: string) => item.isKnown && (RuntimeValue.isRuntimeValue(item.isKnown) ? item.isKnown.value : item.isKnown),
      },
      { path: `level.base` },
      { path: `level.value`, check: `_.GCA._level` },
    )
  }

  // 2. Get lable for trait
  const alias = trait.getAliases()[0]
  const label = alias ?? fullName(data)

  if (paths.length === 0) {
    churchil.add(paint.green(trait.id)).add(` `)
    churchil.add(paint.identity(label)).add(` `)

    churchil.debug()
  }

  for (const [i, { path, check, filter }] of paths.entries()) {
    // 3. Get value as lines
    const value = get(data, path)
    const blocks = toBlocks(value, 0, filter)

    // 4. Print each line
    for (const [row, block] of blocks.entries()) {
      // 4.A. Print prefix: attribute ID and LABEL
      if (i === 0 && row === 0) {
        churchil.add(paint.green(trait.id)).add(` `)
        churchil.add(paint.identity(label)).add(` `)
      } else {
        churchil.add(` `.repeat(trait.id.length)).add(` `)
        churchil.add(` `.repeat(label.length)).add(` `)
      }

      // 4.B Print path: value
      if (row === 0) churchil.add(paint.dim.grey(`${path}:`)).add(` `)
      else churchil.add(paint.dim.grey(`${` `.repeat(path.length)} `)).add(` `)
      churchil.add(...block)

      // 4.C. Print check value
      if (check) {
        const valueValue = RuntimeValue.isRuntimeValue(value) ? value.value : value
        const checkValue = get(data, check)

        churchil.add(paint.grey.dim(` — `)).add(` `)

        const color = valueValue === checkValue ? paint.grey.italic : paint.red.bold
        churchil.add(color(checkValue))
      }

      churchil.debug()
    }
  }
}

function getColor(value: any): Paint {
  if (value === null) return paint.yellow.italic
  if (value === undefined) return paint.yellow.dim.italic

  let type: `number` | `string` | `boolean` | `unknown` = `unknown`
  if (isNumber(value)) type = `number`
  else if (isString(value)) type = `string`
  else if (isBoolean(value)) type = `boolean`
  else if (RuntimeValue.isRuntimeValue(value)) {
    if (NumericValue.isNumericValue(value)) type = `number`
    else if (StringValue.isStringValue(value)) type = `string`
    else if (BooleanValue.isBooleanValue(value)) type = `boolean`
  }

  if (type === `number` || type === `boolean`) return paint.blue
  else if (type === `string`) return paint.green

  return paint.red
}

function toBlocks(value: any, depth: number = 0, filter?: (item: any, key: string) => boolean): Block[][] {
  const color = getColor(value)

  if (RuntimeValue.isRuntimeValue(value)) return [[color.dim(`<${value.type}> `), color(value.value as string)]]
  else if (isObject(value)) {
    const valueIsArray = isArray(value)
    let keys = valueIsArray ? range(value.length).map(i => i.toString()) : Object.keys(value)

    return keys
      .map(key => {
        const item = value[key]

        if (filter && !filter(item, key)) return null

        const lines = toBlocks(value[key], depth + 1)
        return lines.map((line, index) => {
          const blocks: Block[] = [...line]

          if (valueIsArray) {
            if (index === 0) blocks.unshift(paint.dim.grey(`[${key}] `))
            else blocks.unshift(paint.dim.grey(` `.repeat(key.length + 3)))
          } else {
            if (index === 0) blocks.unshift(paint.dim.grey(`${key}: `))
            else blocks.unshift(paint.dim.grey(` `.repeat(key.length + 2)))
          }

          return blocks
        })
      })
      .flat()
      .filter(line => line !== null) as Block[][]
  }

  return [[color(value as string)]]
}
