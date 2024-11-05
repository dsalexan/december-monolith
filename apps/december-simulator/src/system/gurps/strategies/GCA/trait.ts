import assert from "assert"
import { AnyObject } from "tsdef"
import { get, isNil, isNumber, set } from "lodash"

import { Environment } from "@december/tree"
import { Strategy, Mutation, SET, OVERRIDE, MutableObject } from "@december/compiler"
import { ProcessingSymbolsOptions, ProcessorOptions, ProcessingState, ProcessingPackage } from "@december/compiler/processor"
import { ProcessingPath, ProcessingSymbolTranslationTable } from "@december/compiler/processor/base"
import { StrategyPreProcessOptions, StrategyReProcessOptions } from "@december/compiler/controller/strategy"
import { REFERNECE_ADDED } from "@december/compiler/controller/eventEmitter/event"
import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"

import { Dice } from "@december/system"

import { IGURPSCharacter, IGURPSTrait, Trait } from "@december/gurps"
import { isNameExtensionValid, Type, IGURPSTraitMode, isAlias, getAliases } from "@december/gurps/trait"
import { DamageTable } from "@december/gurps/character"

import { GCACharacter } from "@december/gca"
import { GCATrait } from "@december/gca/trait"

import { unitManager } from "../../../../unit"

import logger, { Block, paint } from "../../../../logger"

// 1. How to handle symbols for processing
const GCAProcessingSymbolsOptions: ProcessingSymbolsOptions = {
  isProxiableIdentifier: ({ content, value }) => isAlias(value),
  // TODO: It is not always going to be "level"
  identifierSymbolToPropertyPattern: (symbol, translationTable: ProcessingSymbolTranslationTable) => {
    let value = translationTable.get(symbol) ?? symbol.value

    return PROPERTY(REFERENCE(`alias`, value), `level`)
  },
}

// 2. How to handle processing in general
const GCAProcessingOptions: ProcessorOptions & ProcessingSymbolsOptions = {
  ...GCAProcessingSymbolsOptions,
  unitManager: unitManager,
}

// 3. Context relevant transformations (but handling RE-PROCESSING)
const GCAReProcessingOptionsGenerator: (object: MutableObject) => StrategyReProcessOptions = object => ({
  ...GCAProcessingOptions,
  referenceToSource: referenceKey => {
    if (referenceKey === `thr`) debugger

    const [referencedObject] = object.controller.store.getByReference(new Reference(`alias`, referenceKey), false)

    debugger
    // if reference is found
    // TODO: It is not always going to be "level"
    if (referencedObject && !isNil(referencedObject.data.level)) return { [referenceKey]: referencedObject.data.level }

    return null
  },
})

export const IMPORT_TRAIT_FROM_GCA_STRATEGY = new Strategy() //

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
        damage: {
          basedOn: _mode.damagebasedon!,
          // form: Damage.Form.fromGCA(_mode.dmg!),
          // type: Damage.Type.fromGCA(_mode.damtype!),
          // value: _mode.damage!,
        },
      }

      mutations.push(SET(`modes.[${i}]`, mode))

      // basedOn attribute is necessary to calculate base thr or sw
      Strategy.addProxyListener(REFERNECE_ADDED(REFERENCE(`alias`, mode.damage.basedOn)), `compute:mode`, { arguments: { modeIndex: i } })(object)

      // global.__DEBUG_BREAKPOINT = i === 0 && _trait.name === `Karate`

      // computed expressions are re-processed by computed:re-processing (auto re-processing, no need to specify in creating package), but we check inside compute:mode if they are ready
      const environment = Trait.makeGURPSTraitEnvironment(object, mode)
      const translationTable = new ProcessingSymbolTranslationTable({ [`thr`]: mode.damage.basedOn })

      const pkg = new ProcessingPackage(object, `_.GCA.modes[${i}].dmg`, `modes[${i}].damage.form`, `compute:re-processing`, environment, translationTable)

      const damageForm = Strategy.preProcess(pkg, { scope: `math-enabled`, ...GCAProcessingOptions })
      const damageType = Strategy.preProcess(pkg.setPath(`_.GCA.modes[${i}].damtype`, `modes[${i}].damage.type`), { scope: `math-enabled`, ...GCAProcessingOptions })
      const damageValue = Strategy.preProcess(pkg.setPath(`_.GCA.modes[${i}].damage`, `modes[${i}].damage.value`), { scope: `math-enabled`, ...GCAProcessingOptions })

      mutations.push(...damageForm.mutations, ...damageType.mutations, ...damageValue.mutations)
      integrityEntries.push(...damageForm.integrityEntries, ...damageType.integrityEntries, ...damageValue.integrityEntries)
    }

    // ALIASES
    const aliases = getAliases(trait.type, trait.name, trait.nameExtension)
    mutations.push(SET(`__.aliases`, aliases))

    for (const [key, value] of Object.entries(trait)) mutations.push(SET(key, value))

    return { mutations, integrityEntries }
  },
)

// B. GENERIC PROCESSING
IMPORT_TRAIT_FROM_GCA_STRATEGY.registerReProcessingFunction(`compute:re-processing`, GCAReProcessingOptionsGenerator)

// C. SPECIFIC COMPUTES
// C.1. modes
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  // [SELF_PROPERTY(/modes\[(\d+)\].damage.form/), SELF_PROPERTY(/modes\[(\d+)\].damage.type/), SELF_PROPERTY(/modes\[(\d+)\].damage.value/)],
  [SELF_PROPERTY(/modes\[(\d+)\].damage.basedOn/)],
  `compute:mode`, //
  (object, { arguments: { modeIndex, ...args } }) => {
    const mutations: Mutation[] = []
    const integrityEntries: IntegrityEntry[] = []

    // 1. Get modes (by merger data and metadata)
    const mode = get(object._getData(object.data.modes, `modes`), modeIndex)

    // 2. Generate options with contextualized object
    const options = GCAReProcessingOptionsGenerator(object)
    const translationTable = new ProcessingSymbolTranslationTable({ [`thr`]: mode.damage.basedOn })

    // 3. Process expressions
    const outputs: ReturnType<(typeof Strategy)[`process`]>[] = []
    const paths: ProcessingPath[] = [
      { expression: `_.GCA.modes[${modeIndex}].dmg`, target: `modes[${modeIndex}].damage.form` },
      { expression: `_.GCA.modes[${modeIndex}].damtype`, target: `modes[${modeIndex}].damage.type` },
      { expression: `_.GCA.modes[${modeIndex}].damage`, target: `modes[${modeIndex}].damage.value` },
    ]
    for (const path of paths) {
      // 4. Assemble package
      const pkg = new ProcessingPackage(object, path.expression, path.target, `compute:re-processing`, options.environment, translationTable)
    }

    // 7. Return mutations (if any)
    mutations.push(...outputs.flatMap(({ mutations }) => mutations))
    integrityEntries.push(...outputs.flatMap(({ integrityEntries }) => integrityEntries))

    return { mutations, integrityEntries }
  },
  {
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`modeIndex`),
  },
)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  // [SELF_PROPERTY(/modes\[(\d+)\].damage.form/), SELF_PROPERTY(/modes\[(\d+)\].damage.type/), SELF_PROPERTY(/modes\[(\d+)\].damage.value/)],
  [SELF_PROPERTY(/modes\[(\d+)\].damage.basedOn/)],
  `compute:mode`, //
  (object, { arguments: { modeIndex, ...args } }) => {
    const mutations: Mutation[] = []
    const integrityEntries: IntegrityEntry[] = []

    // 1. Get modes (by merger data and metadata)
    const mode = get(object._getData(object.data.modes, `modes`), modeIndex)

    // 2. Generate options with contextualized object
    const options = GCAReProcessingOptionsGenerator(object)
    const translationTable = new ProcessingSymbolTranslationTable({ [`thr`]: mode.damage.basedOn })

    // 3. Re-process all states
    const states = [mode.damage.form, mode.damage.type, mode.damage.value] as ProcessingState[]
    const outputs: ReturnType<(typeof Strategy)[`process`]>[] = []
    for (const state of states) {
      const _expression = get(state.package.object.data, state.package.path.expression)

      // 4. Inject specific missing references in base environment
      const newEnvironment = Strategy.injectMissingReferences(object, state.missingIdentifiers, translationTable, state.package.environment, (identifier, key) => {
        if (isAlias(key)) {
          const [referencedObject] = object.controller.store.getByReference(new Reference(`alias`, key), false)
          if (referencedObject) {
            // TODO: Do for shit other than level
            return referencedObject._getData(referencedObject.data.level, `level`)
          }
        }

        throw new Error(`Fetch for reference "${identifier}/${key}" not implemented`)
      })

      // 5. Process with newly updated environment
      if (newEnvironment) {
        const pkg = newEnvironment ? state.package.setEnvironment(newEnvironment) : state.package
        const output = Strategy.process(pkg.setTranslationTable(translationTable), { ...options, scope: `math-enabled` })
        outputs.push(output)
      }
    }

    const _areAllReady = states.map(({ isReady }) => isReady)
    const _expressions = states.map(state => get(state.package.object.data, state.package.path.expression))
    const _missingIdentifiers = states.map(({ missingIdentifiers }) => missingIdentifiers)
    const areAllReady = states.every(({ isReady }) => isReady)

    // 6. If all proper states are ready, DO SOMETHING WHAT? TODO
    if (areAllReady) debugger
    else debugger

    // 7. Return mutations (if any)
    mutations.push(...outputs.flatMap(({ mutations }) => mutations))
    integrityEntries.push(...outputs.flatMap(({ integrityEntries }) => integrityEntries))

    return { mutations, integrityEntries }
  },
  {
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`modeIndex`),
  },
)
