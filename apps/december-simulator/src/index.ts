import seedrandom from "seedrandom"
seedrandom(`hello.`, { global: true })

import path from "path"

import { dump } from "@december/utils"
import { GCAAttribute, GCACharacter, GCACharacterImporter } from "@december/gca"
import { makeArtificialEventTrace, MutableObject, SET } from "@december/compiler"

import churchil, { paint } from "./logger"
import { GURPSCharacter } from "./system/gurps"
import { IMPORT_CHARACTER_FROM_GCA_STRATEGY } from "./system/gurps/strategies/GCA/character"
import { IMPORT_TRAIT_FROM_GCA_STRATEGY } from "./system/gurps/strategies/GCA/trait"
import { makeArtificilEventDispatcher } from "../../../packages/compiler/src/controller/eventEmitter/event"
import { fullName, IGURPSGeneralTrait } from "../../../packages/gurps/src/trait"
import { RuntimeIGURPSAttribute, RuntimeIGURPSGeneralTrait } from "./system/gurps/strategies/GCA/trait/parsers"
import { GCABase, GCABaseNonSkillNonSpellNonEquipment, GCABaseTrait, GCABaseTraitPointBased } from "../../../packages/gca/src/trait"
import { DiffObjects } from "tsdef"
import { get, isBoolean, isNumber, isString } from "lodash"
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

    if (type !== `stat`) continue

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

  const paths = [
    {
      value: `score.base.initial`,
      expression: `score.base.source`,
    },
    {
      value: `score.base.value`,
    },
    {
      value: `score.value`,
    },
  ]
  for (const attribute of character.stats) {
    const data = attribute.getData()
    const alias = attribute.getAliases()[0]
    const label = alias ?? fullName(data)

    for (const [i, path] of paths.entries()) {
      if (i === 0) {
        churchil.add(paint.green(attribute.id)).add(` `)
        churchil.add(paint.identity(label)).add(` `)
      } else {
        churchil.add(` `.repeat(attribute.id.length)).add(` `)
        churchil.add(` `.repeat(label.length)).add(` `)
      }

      churchil.add(paint.dim.grey(`${path.value}:`)).add(` `)

      const value = get(data, path.value)
      const expression = path.expression ? get(data, path.expression) : undefined

      let color = paint.red
      if (value === null || value === undefined) {
        color = paint.yellow
        if (value === undefined) color = color.dim

        churchil.add(color.italic(value)).add(` `)
      } else if (isPrimitive(value)) {
        if (isNumber(value) || isBoolean(value)) color = paint.blue
        else if (isString(value)) color = paint.green

        churchil.add(color(value))

        if (path.value === `score.value`) {
          const _score = (attribute.data as any)._.GCA._score
          churchil.add(paint.grey.dim(` — `)).add(` `)

          const _color = value === _score ? paint.grey.italic : paint.red.bold
          churchil.add(_color(_score))
        }
      } else if (RuntimeValue.isRuntimeValue(value)) {
        if (NumericValue.isNumericValue(value) || BooleanValue.isBooleanValue(value)) color = paint.blue
        else if (StringValue.isStringValue(value)) color = paint.green

        churchil.add(color.dim(value.type)).add(` `)
        churchil.add(color(value.value))

        if (path.value === `score.value`) {
          const _score = (attribute.data as any)._.GCA._score
          churchil.add(paint.grey.dim(` — `)).add(` `)

          const _color = value.value === _score ? paint.grey.italic : paint.red.bold
          churchil.add(_color(_score))
        }
      }

      if (expression) {
        churchil.add(paint.grey.dim(` — `)).add(` `)
        churchil.add(paint.grey(expression))
      }

      churchil.debug()
    }
  }
  debugger
}

run()
