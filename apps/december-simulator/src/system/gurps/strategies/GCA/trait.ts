import assert from "assert"
import { v4 as uuidv4 } from "uuid"
import { isNil, isNumber, set } from "lodash"

import { Strategy, Mutation, SET, OVERRIDE } from "@december/compiler"
import { ProcessingSymbolsOptions, ProcessorOptions } from "@december/compiler/processor"
import { REFERNECE_ADDED } from "@december/compiler/controller/eventEmitter/event"
import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"

import { Dice } from "@december/system"

import { IGURPSCharacter, IGURPSTrait } from "@december/gurps"
import { isNameExtensionValid, Type, IGURPSTraitMode, isAlias, getAliases } from "@december/gurps/trait"
import { DamageTable } from "@december/gurps/character"

import { GCACharacter } from "@december/gca"
import { GCATrait } from "@december/gca/trait"

import { unitManager } from "../../../../unit"

const GCAProcessingSymbolsOptions: ProcessingSymbolsOptions = {
  isProxiableIdentifier: ({ content, value }) => isAlias(value),
  // TODO: It is not always going to be "level"
  identifierSymbolToPropertyPattern: ({ content, value }) => PROPERTY(REFERENCE(`alias`, value), `level`),
}

const GCAProcessingOptions: ProcessorOptions & ProcessingSymbolsOptions = {
  ...GCAProcessingSymbolsOptions,
  unitManager: unitManager,
}

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

      const damageForm = Strategy.preProcess(object, { original: `_.GCA.modes[${i}].dmg`, target: `modes[${i}].form` }, { scope: `math-enabled`, executionContext, ...GCAProcessingOptions })
      global.__DEBUG_BREAKPOINT = i === 0 && _trait.name === `Karate`
      const damageType = Strategy.preProcess(object, { original: `_.GCA.modes[${i}].damtype`, target: `modes[${i}].type` }, { scope: `math-enabled`, executionContext, ...GCAProcessingOptions })
      const damageValue = Strategy.preProcess(object, { original: `_.GCA.modes[${i}].damage`, target: `modes[${i}].value` }, { scope: `math-enabled`, executionContext, ...GCAProcessingOptions })

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
IMPORT_TRAIT_FROM_GCA_STRATEGY.registerProcessingFunction(`compute:processing`, controller => ({
  ...GCAProcessingOptions,
  referenceToSource: referenceKey => {
    const [object] = controller.store.getByReference(new Reference(`alias`, referenceKey), false)

    debugger
    // if reference is found
    // TODO: It is not always going to be "level"
    if (object && !isNil(object.data.level)) return { [referenceKey]: object.data.level }

    return null
  },
}))

// C. SPECIFIC COMPUTES
// C.1. modes
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(/modes\[(\d+)\].form/), SELF_PROPERTY(/modes\[(\d+)\].type/), SELF_PROPERTY(/modes\[(\d+)\].value/)],
  `compute:mode`, //
  (
    object,
    {
      arguments: { modeIndex },
      executionContext: {
        eventDispatcher: { matches },
      },
    },
  ) => {
    const mutations: Mutation[] = []

    if (modeIndex === undefined) {
      const match = matches[0] as any
      const result = match.propertyMatch.regexResult
      modeIndex = parseInt(result[1])
      assert(!isNil(modeIndex) && !isNaN(modeIndex), `Mode index should be a number`)
    }

    /**
     * TODO: There is some things to fix here
     *
     * 1. If different mode indexes fire compute:mode, only the first one would resolve.
     *    We need some sort of "event -> argument" resolve pipeline (since arguments are hashable to determine "uniqueness" of execution context)
     */

    debugger

    return mutations
  },
)
