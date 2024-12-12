import assert from "assert"
import { AnyObject } from "tsdef"
import { get, isNil, isNumber, set } from "lodash"

import { ObjectSource, Simbol, SymbolTable } from "@december/tree"
import { Strategy, Mutation, SET } from "@december/compiler"

import type { StrategyProcessingPackage, StrategyProcessListenOptions, StrategyProcessBuildOptions, StrategyProcessSymbolOptions } from "@december/compiler/controller/strategy"
import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { REFERENCE_ADDED } from "@december/compiler/controller/eventEmitter/event"

import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"

import { IGURPSCharacter, IGURPSTrait, Trait } from "@december/gurps"
import { isNameExtensionValid, Type, IGURPSTraitMode, isAlias, getAliases } from "@december/gurps/trait"
import { DamageTable } from "@december/gurps/character"

import { GCACharacter, GCATrait } from "@december/gca"
import { GCAProcessingBuildOptions, GCAProcessingListenOptions, GCAProcessingSymbolOptionsGenerator } from "./options"

import logger, { Block, paint } from "../../../../../logger"

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
      }

      mutations.push(SET(`modes.[${i}]`, mode))

      // basedOn attribute is necessary to calculate base thr or sw
      Strategy.addProxyListener(REFERENCE_ADDED(REFERENCE(`alias`, mode.damage.basedOn)), `compute:mode`, { arguments: { modeIndex: i } })(object)
    }

    // ALIASES
    const aliases = getAliases(trait.type, trait.name, trait.nameExtension)
    mutations.push(SET(`__.aliases`, aliases))

    for (const [key, value] of Object.entries(trait)) mutations.push(SET(key, value))

    return { mutations, integrityEntries }
  },
)

// B. GENERIC PROCESSING
IMPORT_TRAIT_FROM_GCA_STRATEGY.registerReProcessingFunction(`compute:re-processing`, GCAProcessingSymbolOptionsGenerator)

// C. SPECIFIC COMPUTES
// C.1. modes
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  // [SELF_PROPERTY(/modes\[(\d+)\].damage.form/), SELF_PROPERTY(/modes\[(\d+)\].damage.type/), SELF_PROPERTY(/modes\[(\d+)\].damage.value/)],
  [SELF_PROPERTY(/modes\.\[(\d+)\].damage.basedOn/)],
  `compute:mode`,
  (object, { arguments: { modeIndex, ...args } }) => {
    const mutations: Mutation[] = []
    const integrityEntries: IntegrityEntry[] = []

    // 1. Get mode (by merger data and metadata)
    const mode = get(object._getData(object.data.modes, `modes`), modeIndex)
    const path = `modes.[${modeIndex}].damage.form`

    // 2. Prepare stuff to process
    const character = object.controller.store.getByID(`general`)
    assert(character, `Character not found`)
    const baseEnvironment = Trait.makeGURPSTraitEnvironment(character, mode)
    baseEnvironment.addSource(ObjectSource.fromDictionary(`mode`, { [`thr`]: { type: `proxy`, value: mode.damage.basedOn } }))

    // const fallbackEnvironment =

    const options = { ...GCAProcessingBuildOptions, ...GCAProcessingSymbolOptionsGenerator(object) }

    // 3. Process expression
    const outputs: ReturnType<(typeof Strategy)[`process`]>[] = []
    const paths: { expression: string; target: string }[] = [
      // { expression: `_.GCA.modes.[${modeIndex}].dmg`, target: `modes.[${modeIndex}].damage.form` },
      // { expression: `_.GCA.modes.[${modeIndex}].damtype`, target: `modes.[${modeIndex}].damage.type` },
      { expression: `_.GCA.modes.[${modeIndex}].damage`, target: `modes.[${modeIndex}].damage.value` },
    ]
    for (const path of paths) {
      let expression = get(object.data, path.expression)
      const processingPackage: StrategyProcessingPackage = { expression, environment: baseEnvironment }

      outputs.push(Strategy.process(processingPackage, object, path.target, { ...options, scope: `math-enabled`, reProcessingFunction: `compute:re-processing` }))
    }

    // [DEBUG]
    const nonReady = outputs.filter(output => !output.state.isReady)
    if (nonReady.length > 0) {
      // DEBUG: Show missing references for progressive testing
      for (const [i, { state }] of outputs.entries()) {
        if (state.isReady) continue

        const path = paths[i]

        logger //
          .add(paint.identity(` `.repeat(10)))
          .add(paint.grey.dim(`[${object.id}/`), paint.grey(object.data.name), paint.grey.dim(`]`))
          .add(paint.grey.dim(` ${path.target}`))
          .debug()

        logger //
          .add(paint.identity(` `.repeat(10)))
          .add(paint.grey.dim(`[${object.id}/`), paint.grey(object.data.name), paint.grey.dim(`]`))
          .add(paint.grey.dim.italic(` output    `))
          .add(paint.grey.dim(` ${state.resolved.tree.expression()}`))
          .debug()

        if (state.fallback)
          logger //
            .add(paint.identity(` `.repeat(10)))
            .add(paint.grey.dim(`[${object.id}/`), paint.grey(object.data.name), paint.grey.dim(`]`))
            .add(paint.grey.dim.italic(` fallback  `))
            .add(paint.grey(` ${state.fallback.tree.expression()}`))
            .debug()

        for (const symbol of state.symbolTable.getSymbols()) {
          logger
            .add(paint.identity(` `.repeat(10)))
            .add(paint.grey.dim(`[${object.id}/`), paint.grey(object.data.name), paint.grey.dim(`]`))
            .add(paint.identity(` `))
            .add(...symbol.explain({ environment: state.environment, hideIfPresentInEnvironment: false }))
          logger.debug()
        }
      }
    }

    // 4. Return mutations (if any)
    mutations.push(...outputs.flatMap(({ mutations }) => mutations))
    integrityEntries.push(...outputs.flatMap(({ integrityEntries }) => integrityEntries))

    return { mutations, integrityEntries }
  },
  {
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`modeIndex`),
  },
)
