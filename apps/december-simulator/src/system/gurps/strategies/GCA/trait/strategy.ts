import assert from "assert"
import { AnyObject } from "tsdef"
import { get, isNil, isNumber, set } from "lodash"

import { Strategy, Mutation, SET, MutableObject } from "@december/compiler"

import { Environment } from "@december/tree"
import { VariableValue } from "@december/tree/interpreter"

import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { REFERENCE_ADDED } from "@december/compiler/controller/eventEmitter/event"

import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"

import { IGURPSCharacter, IGURPSTrait, Trait } from "@december/gurps"
import { isNameExtensionValid, Type, IGURPSTraitMode, isAlias, getAliases } from "@december/gurps/trait"
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
    const trait: Omit<IGURPSTrait, `modes`> = {
      name: _trait.name,
      type: Type.fromGCASection(_trait.section),
      active: _trait.active,
      //
      points: NaN,
      level: NaN,
    }

    // NAMEEXT
    if (isNameExtensionValid(_trait.nameext)) trait.nameExtension = _trait.nameext

    // POINTS, LEVEL, SCORE
    // TODO: Investigate how to calculate this things
    if (!isNil(_trait.points)) trait.points = parseInt(_trait.points.toString())
    if (!isNil(_trait.level)) trait.level = parseInt(_trait.level.toString())
    if (!isNil(_trait.score)) trait.score = parseInt(_trait.score.toString())

    assert(isNumber(trait.points), `Points should be a number`)
    assert(isNumber(trait.level), `Level should be a number`)
    assert(isNumber(trait.score) || trait.score === undefined, `Score should be a number`)

    // MODES
    const M = _trait.modes?.length ?? 0
    for (let i = 0; i < M; i++) {
      /**
       * How damage works?
       *
       *  damage        — damage value in dice
       *  dmg           — damage form (swing or thrust)
       *  damagebasedon — source for the damage form base value (i.e. where to get value for sw or thr)
       */
      const _mode = _trait.modes![i]

      const mode: Omit<IGURPSTraitMode, `damage`> & { damage: Omit<IGURPSTraitMode[`damage`], `form` | `type` | `value`> } = {
        name: _mode.name,
        damage: { basedOn: _mode.damagebasedon! },
        // TODO: Create integrity entry for basedOn
      }

      const BASED_ON_INTEGRITY_ENTRY = object.makeIntegrityEntry(`modes.[${i}].damage.basedOn`, mode.damage.basedOn)
      integrityEntries.push(BASED_ON_INTEGRITY_ENTRY)

      mutations.push(SET(`modes.[${i}]`, mode))

      // basedOn attribute is necessary to calculate base thr or sw
      Strategy.addProxyListener(REFERENCE_ADDED(REFERENCE(`alias`, mode.damage.basedOn)), `compute:mode`, {
        arguments: { modeIndex: i }, //
        integrityEntries: [BASED_ON_INTEGRITY_ENTRY],
      })(object)
    }

    // ALIASES
    const aliases = getAliases(trait.type, trait.name, trait.nameExtension)
    mutations.push(SET(`__.aliases`, aliases))

    for (const [key, value] of Object.entries(trait)) mutations.push(SET(key, value))

    return { mutations, integrityEntries }
  },
)

// B. GENERIC PROCESSING
IMPORT_TRAIT_FROM_GCA_STRATEGY.registerReProcessingFunction(`compute:re-processing`, GCAStrategyProcessorResolveOptionsGenerator, GCAStrategyProcessorListenOptions)

// C. SPECIFIC COMPUTES
// C.1. modes
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  // [SELF_PROPERTY(/modes\[(\d+)\].damage.form/), SELF_PROPERTY(/modes\[(\d+)\].damage.type/), SELF_PROPERTY(/modes\[(\d+)\].damage.value/)],
  [SELF_PROPERTY(/modes\.\[(\d+)\].damage.basedOn/)],
  `compute:mode`,
  (object, { arguments: { modeIndex, ...args } }) => {
    // TODO: If this was fired becaused basedOn changed, create a new proxy listener for alias reference

    const mutations: Mutation[] = []
    const integrityEntries: IntegrityEntry[] = []

    // 1. Get mode (by merger data and metadata)
    const mode: IGURPSTraitMode = get(object._getData(object.data.modes, `modes`), modeIndex)
    const path = `modes.[${modeIndex}].damage.form`

    // 2. Prepare stuff to process
    const character = object.controller.store.getByID(`general`)
    assert(character, `Character not found`)

    const baseEnvironment = new Environment(`gurps:local`, Trait.makeGURPSTraitEnvironment(character, object.data))
    baseEnvironment.assignValue(`thr`, new VariableValue(mode.damage.basedOn))

    const options = { ...GCAStrategyProcessorListenOptions, ...GCAStrategyProcessorOptionsGenerator(object) }

    // 3. Process expression
    const outputs: ReturnType<(typeof Strategy)[`process`]>[] = []
    const paths: { expression: string; target: string }[] = [
      // { expression: `_.GCA.modes.[${modeIndex}].dmg`, target: `modes.[${modeIndex}].damage.form` },
      // { expression: `_.GCA.modes.[${modeIndex}].damtype`, target: `modes.[${modeIndex}].damage.type` },
      { expression: `_.GCA.modes.[${modeIndex}].damage`, target: `modes.[${modeIndex}].damage.value` },
    ]
    for (const path of paths) {
      let expression = get(object.data, path.expression)

      outputs.push(
        Strategy.process(object, path.target, {
          ...options,
          //
          expression,
          environment: baseEnvironment,
          //
          syntacticalContext: { mode: `expression` },
          reProcessingFunction: `compute:re-processing`,
        }),
      )
    }

    // [DEBUG]
    // ===========================================================================================================================
    for (const { state } of outputs) {
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

function explainProcessOutput(object: MutableObject, path: string, state: StrategyProcessState): Block[][] {
  // if (state.isReady) return []

  const rows: Block[][] = []

  function prefix(): Block[] {
    return [
      paint.identity(` `.repeat(10)), //
      paint.grey.dim(`[${object.id}/`),
      paint.grey(object.data.name as string),
      paint.grey.dim(`] `),
    ]
  }

  if (state.isReady) rows.push([...prefix(), paint.blue.bold(`IS READY!!!!!!`)])
  else rows.push([...prefix(), paint.yellow.dim(`Not Ready`)])

  rows.push([...prefix(), paint.grey.dim(`${path}`)])

  if (!state.isReady) {
    const tree = state.evaluation?.node ?? state.AST
    rows.push([...prefix(), paint.grey.dim.italic(`output    `), paint.grey.dim(` ${tree.getContent()}`)])
  } else {
    const runtimeValue = state.evaluation?.runtimeValue
    rows.push([
      ...prefix(), //
      paint.grey.dim.italic(`output    `),
      paint.grey(`<${runtimeValue!.type}> `),
      paint.bold(String(runtimeValue!.value)),
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
