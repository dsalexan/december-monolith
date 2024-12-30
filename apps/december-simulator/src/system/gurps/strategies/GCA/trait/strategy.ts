import { Nullable } from "./../../../../../../../../packages/utils/src/typing/index"
import assert from "assert"
import { AnyObject, NonNil, WithOptionalKeys } from "tsdef"
import { get, isNil, isNumber, isString, set } from "lodash"

import { Strategy, Mutation, SET, MutableObject, OVERRIDE } from "@december/compiler"

import { Environment } from "@december/tree"
import { CallExpression, ExpressionStatement, Identifier } from "@december/tree/tree"
import { ExpressionValue, NumericValue, VariableValue } from "@december/tree/interpreter"
import { makeToken } from "@december/tree/utils/factories"

import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { REFERENCE_ADDED } from "@december/compiler/controller/eventEmitter/event"

import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"

import { IGURPSCharacter, IGURPSTrait, Trait } from "@december/gurps"
import { isNameExtensionValid, Type, IGURPSTraitMode, IGURPSTraitModeStrength, isAlias, getAliases, Cost } from "@december/gurps/trait"
import { DamageTable } from "@december/gurps/character"

import { GCACharacter, GCATrait } from "@december/gca"
import { GCAStrategyProcessorListenOptions, GCAStrategyProcessorOptionsGenerator, DEFAULT_PROPERTY, GCAStrategyProcessorResolveOptionsGenerator } from "./options"

import logger, { Block, paint } from "../../../../../logger"
import { StrategyProcessState } from "@december/compiler/controller/strategy/processor"

//
//

export const IMPORT_TRAIT_FROM_GCA_STRATEGY = new Strategy()

// A. GENERAL
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`_.GCA`)], //
  `GCA:initialize`,
  (object, { executionContext }) => {
    const mutations: Mutation[] = []
    const integrityEntries: IntegrityEntry[] = []

    const _trait = object.data._.GCA as GCATrait
    const trait: WithOptionalKeys<IGURPSTrait, `modes` | `cost`> = {
      name: _trait.name,
      type: Type.fromGCASection(_trait.section),
      active: _trait.active,
      //
      points: NaN,
      level: { system: NaN, base: NaN, total: NaN },
    }

    // NAMEEXT
    if (isNameExtensionValid(_trait.nameext)) trait.nameExtension = _trait.nameext

    // LEVEL
    // if (!isNil(_trait.level)) trait.level = parseInt(_trait.level.toString())
    trait.level.system = _trait.syslevels
    trait.level.base = _trait.baselevel
    trait.level.total = computeLevel(trait.level.system, trait.level.base)

    const expectedLevel = parseInt(_trait.level!.toString())
    assert(trait.level.total === expectedLevel, `Level should be equal to the sum of system and base levels`)

    // POINTS
    // if (!isNil(_trait.points)) trait.points = parseInt(_trait.points.toString())
    if (_trait.section !== `equipment`) {
      assert(!isNil(_trait.traitCost), `Trait cost should be defined for non-equipment traits`)

      const costProgression = _trait.traitCost.cost
      assert(isString(costProgression), `Cost progression should be a string`)

      trait.cost = Cost.convertCost(costProgression, _trait.traitCost.upto)
      trait.points = Cost.calculateCost(trait.level, trait.cost)

      let expectedPoints = parseInt(_trait.points!.toString())
      if (!expectedPoints && _trait.premodspoints) expectedPoints = parseInt(_trait.premodspoints!.toString())
      if (expectedPoints) assert(trait.points === expectedPoints, `Points should be equal to the points defined in the trait`)
    }
    //
    else throw new Error(`Not implemented`)

    // SCORE
    // TODO: Investigate how to calculate this things
    if (!isNil(_trait.score)) trait.score = parseInt(_trait.score.toString())
    assert(isNumber(trait.score) || trait.score === undefined, `Score should be a number`)

    // MODES
    const M = _trait.modes?.length ?? 0
    for (let i = 0; i < M; i++) {
      const _mode = _trait.modes![i]

      // 1. First find out allowed roll traits
      let rollBasedOn: Nullable<IGURPSTraitMode[`rollBasedOn`]> = null

      if (_mode.skillused?.includes(`"`)) debugger // TODO: Test this
      if (_mode.skillused) rollBasedOn = _mode.skillused.split(`,`).map(s => s.trim())

      assert(!isNil(rollBasedOn) && rollBasedOn.every(s => isString(s)), `Skill should be a list of strings`)

      // 2. Create mode
      const mode: IGURPSTraitMode = {
        name: _mode.name,
        rollBasedOn,
      }

      // 3. Specific shit for damaging modes
      const isDamaging = _mode.dmg !== undefined
      if (isDamaging) {
        /**
         * How damage works?
         *
         *  damage        — damage value in dice
         *  dmg           — damage form (swing or thrust)
         *  damagebasedon — source for the damage form base value (i.e. where to get value for sw or thr)
         */

        // 1. Make sure we have a valid DamageBasedOn
        const damageBasedOn = _mode.damagebasedon ?? null
        assert(damageBasedOn === null || isString(damageBasedOn), `BasedOn should be a string OR null`)

        // 2. Update mode
        set(mode, `damage`, { basedOn: damageBasedOn } as IGURPSTraitMode[`damage`])

        // 3. Create integrity entry for BASED_ON (since damage could change based on this)
        //        (basically everytime we update basedOn we should send a new integrityEntry for the same path with the new value)
        const BASED_ON_INTEGRITY_ENTRY = object.makeIntegrityEntry(`modes.[${i}].damage.basedOn`, String(damageBasedOn))
        integrityEntries.push(BASED_ON_INTEGRITY_ENTRY)

        // 4. Add listener for changes in basedOn reference
        //  (basedOn attribute is necessary to calculate base thr or sw)
        //  (basedOn === null most likely means that the damage is fixed, so we dont need to watch any external updates)
        if (damageBasedOn) {
          Strategy.addProxyListener(REFERENCE_ADDED(REFERENCE(`alias`, damageBasedOn)), `compute:mode:damage`, {
            arguments: { modeIndex: i }, //
            integrityEntries: [BASED_ON_INTEGRITY_ENTRY],
          })(object)
        }
      }

      // 4. Specific shit for minimum strength
      // if (object.id === `15038`) debugger
      if (_mode.minst) {
        const match = /^(\d+)([†‡RBM]+)?$/i.exec(_mode.minst)
        assert(match, `There should have been a match here`)

        const [_, numericValue, markers] = match
        const ST: IGURPSTraitModeStrength = { minimum: parseInt(numericValue) }
        assert(!isNaN(ST.minimum), `MinimumST should be a number`)

        if (markers) {
          if (markers.toUpperCase().includes(`†`)) ST.twoHanded = true
          if (markers.toUpperCase().includes(`‡`)) ST.twoHandedAndUnready = true
          if (markers.toUpperCase().includes(`R`)) debugger
          if (markers.toUpperCase().includes(`B`)) debugger
          if (markers.toUpperCase().includes(`M`)) ST.mounted = true
        }

        mode.strength = ST
      }

      // 5. Push mutation
      mutations.push(SET(`modes.[${i}]`, mode))
    }

    // ALIASES
    const aliases = getAliases(trait.type, trait.name, trait.nameExtension)
    mutations.push(SET(`__.aliases`, aliases))

    for (const [key, value] of Object.entries(trait)) mutations.push(SET(key, value))

    return { mutations, integrityEntries }
  },
)

// B. GENERIC PROCESSING
IMPORT_TRAIT_FROM_GCA_STRATEGY.registerReProcessingFunction(`compute:re-processing`, { mode: `expression` }, GCAStrategyProcessorResolveOptionsGenerator, GCAStrategyProcessorListenOptions)

// C. SPECIFIC COMPUTES
// C.1. damaging modes
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  // [SELF_PROPERTY(/modes\[(\d+)\].damage.form/), SELF_PROPERTY(/modes\[(\d+)\].damage.type/), SELF_PROPERTY(/modes\[(\d+)\].damage.value/)],
  [SELF_PROPERTY(/modes\.\[(\d+)\].damage.basedOn/)],
  `compute:mode:damage`,
  (object, { arguments: { modeIndex, ...args } }) => {
    // TODO: If this was fired becaused basedOn changed, create a new proxy listener for alias reference

    const mutations: Mutation[] = []
    const integrityEntries: IntegrityEntry[] = []

    // 1. Get mode (by merger data and metadata)
    const mode: IGURPSTraitMode = get(object._getData(object.data.modes, `modes`), modeIndex)
    assert(mode.damage, `Unimplemented for non-damaging modes`)

    // 2. Prepare stuff to process
    const character = object.controller.store.getByID(`general`)
    assert(character, `Character not found`)

    const baseEnvironment = new Environment(`gurps:local`, Trait.makeGURPSTraitEnvironment(character, object.data))
    baseEnvironment.assignValue(`modeIndex`, new NumericValue(modeIndex))

    //    (some traits have fixed damage; or, at least, based on other shit than thr/sw)
    if (mode.damage.basedOn) {
      baseEnvironment.assignValue(`thr`, new ExpressionValue(new CallExpression(new Identifier(makeToken(`@basethdice`)), [new Identifier(makeToken(mode.damage.basedOn!))])))
      baseEnvironment.assignValue(`sw`, new ExpressionValue(new CallExpression(new Identifier(makeToken(`@baseswdice`)), [new Identifier(makeToken(mode.damage.basedOn!))])))
    }

    const options = { ...GCAStrategyProcessorListenOptions, ...GCAStrategyProcessorOptionsGenerator(object) }

    // 3. Process expression
    const outputs: (ReturnType<(typeof Strategy)[`process`]> & { path: string })[] = []
    const paths: { expression: string; target: string }[] = [
      // { expression: `_.GCA.modes.[${modeIndex}].dmg`, target: `modes.[${modeIndex}].damage.form` },
      { expression: `_.GCA.modes.[${modeIndex}].damtype`, target: `modes.[${modeIndex}].damage.type` },
      { expression: `_.GCA.modes.[${modeIndex}].damage`, target: `modes.[${modeIndex}].damage.value` },
    ]
    for (const path of paths) {
      let expression = get(object.data, path.expression)

      global.__PROCESSING_OBJECT = object

      outputs.push({
        ...Strategy.process(object, path.target, {
          ...options,
          //
          expression,
          environment: baseEnvironment,
          //
          syntacticalContext: { mode: `expression` }, // TODO: Probably derive this from "type" of tag in GCA reference
          reProcessingFunction: `compute:re-processing`,
        }),
        path: path.target,
      })
    }

    // [DEBUG]
    // ===========================================================================================================================
    for (const { path, state } of outputs) {
      const rows = explainProcessOutput(object, path, state)
      for (const row of rows) logger.add(...row).debug()
    }
    // ===========================================================================================================================

    // 4. Return mutations (if any)
    mutations.push(...outputs.flatMap(({ mutations }) => mutations))
    integrityEntries.push(...outputs.flatMap(({ integrityEntries }) => integrityEntries))

    return { mutations, integrityEntries }
  },
  {
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`modeIndex`),
  },
)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue([SELF_PROPERTY(/level.(system|base)/)], `compute:level`, object => [OVERRIDE(`level`, computeLevel(object.getProperty(`level.system`), object.getProperty(`level.base`)))])
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue([SELF_PROPERTY(`level.total`), SELF_PROPERTY(`cost`)], `compute:points`, object => [OVERRIDE(`points`, Cost.calculateCost(object.getProperty(`level`), object.getProperty(`cost`)))])

// #region CORE
export function computeLevel(systemLevel: number, baseLevel: number): number {
  const level = systemLevel + baseLevel

  assert(!isNaN(level), `Level should be a number`)

  return level
}

// #endregion

// #region DEBUG
function explainProcessOutput(object: MutableObject, path: string, state: StrategyProcessState): Block[][] {
  // if (state.isReady) return []

  let SHOULD_PRINT = true

  // 1. If we are not ready
  if (!state.isReady) SHOULD_PRINT = true

  if (!SHOULD_PRINT) return []

  const rows: Block[][] = []

  function prefix(): Block[] {
    return [
      paint.identity(` `.repeat(10)), //
      paint.grey.dim(`[${object.id}/`),
      paint.grey(object.data.name as string),
      paint.grey.dim(`] `),
    ]
  }

  if (state.isReady()) rows.push([...prefix(), paint.blue.bold(`IS READY!!!!!!`)])
  else rows.push([...prefix(), paint.yellow.dim(`Not Ready`)])

  rows.push([...prefix(), paint.grey.dim(`${path}`)])
  rows.push([...prefix(), paint.grey.dim(`${state.expression}`)])

  if (!state.isParsed()) {
    rows.push([...prefix(), paint.grey.dim.italic(`output    `), paint.red.bold(` NOT PARSED (complilation error)`)])
  } else if (!state.isReady()) {
    const tree = state.evaluation?.node ?? state.AST!
    rows.push([...prefix(), paint.grey.dim.italic(`output    `), paint.grey.dim(` ${tree.getContent()}`)])
  } else {
    const runtimeValue = state.getValue()
    rows.push([
      ...prefix(), //
      paint.grey.dim.italic(`output    `),
      paint.grey(`<${runtimeValue!.type}> `),
      paint.bold(runtimeValue!.getContent()),
    ])
  }

  if (!state.environment) {
    rows.push([
      paint.identity(` `.repeat(10)), //
      paint.italic.red(`(no environment)`),
    ])
  } else {
    const allSymbols = state.symbolTable.getAllSymbols(state.environment)
    for (const symbol of allSymbols) {
      rows.push([...prefix(), ...symbol.explain(state.environment).flat()])
    }
  }

  return rows
}

// #endregion
