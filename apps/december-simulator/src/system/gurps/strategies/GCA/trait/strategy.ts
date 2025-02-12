import assert from "assert"
import { Nilable } from "tsdef"
import { get, isNil, isNumber, range } from "lodash"

import { SELF_PROPERTY } from "@december/utils/access"

import { NumericValue } from "@december/tree/interpreter"
import { mergeMutationInput, MutableObject, MutationInput, OVERRIDE, Strategy } from "@december/compiler"

import { IGURPSLevelBasedTraitOrModifier } from "@december/gurps/trait/definitions/generic"

import GURPSCharacter from "../../../character"

import { RuntimeIGURPSAttribute, RuntimeIGURPSBaseTrait, RuntimeIGURPSGeneralTrait, RuntimeIGURPSSkillOrSpellOrTechnique } from "./runtime"

import { GCAStrategyProcessorListenOptions, GCAStrategyProcessorOptionsGenerator } from "./options"
import { GCAInitialize } from "./functions"
import { GCAComputeScoreBase, GCAComputeScoreInitial, GCAComputeScoreValue } from "./functions/attribute"
import { GCAComputeDefaults, GCAComputeModeDefaults, GURPSComputeBonus, GURPSComputeLevelBonus, GURPSTaskComputeBonus } from "./functions/base"
import { GCAComputeDefaults_Skill, GCAComputeSkillLevel } from "./functions/skill"
import { GCAComputeAdvantageLevel, GCAComputePointsFull } from "./functions/general"

export const IMPORT_TRAIT_FROM_GCA_STRATEGY = new Strategy()

IMPORT_TRAIT_FROM_GCA_STRATEGY.registerReProcessingFunction(`compute:re-processing`, { mode: `expression` }, GCAStrategyProcessorOptionsGenerator, GCAStrategyProcessorListenOptions)

// A. IMPORT FROM GCA
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`_.GCA`)], //
  `GCA:initialize`,
  object => GCAInitialize(object),
)

//
//
// B. CALCULATE MAIN VALUES (Scores, Levels, Points)

// #region B.1. Score (Attributes)

// IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
//   [SELF_PROPERTY(`score.base.source`)], //
//   `GCA:compute:score:initial`,
//   (object: MutableObject<RuntimeIGURPSAttribute, GURPSCharacter>) => GCAComputeScoreInitial(object),
//   { hashableArguments: { processingStatePath: `score.base.initial` } },
// )

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`score.base.initial`), SELF_PROPERTY(`cost.increment.value`), SELF_PROPERTY(`cost.decrement.value`)], //
  `GCA:compute:score:base`,
  (object: MutableObject<RuntimeIGURPSAttribute, GURPSCharacter>) => GCAComputeScoreBase(object),
)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`score.base.value`)], //
  `GCA:compute:score:value`,
  (object: MutableObject<RuntimeIGURPSAttribute, GURPSCharacter>) => GCAComputeScoreValue(object),
)

// #endregion

// #region B.2. Level (Skills, Spells and Techniques)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(/defaults\.(\d+).expression/), SELF_PROPERTY(`cost`), SELF_PROPERTY(`attribute`)], //
  `GCA:compute:skill:defaults`,
  (object: MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique, GURPSCharacter>, { arguments: { defaultIndex, ...args } }) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    // if (![`skill`, `spell`, `technique`].includes(object.data.type)) return output // TODO: Add technique back in
    if (![`skill`].includes(object.data.type)) return output

    const defaults = object.data.defaults?.list ?? []
    const defaultIndexes = defaultIndex !== undefined ? [defaultIndex] : range(defaults.length)

    let bestDefaultIndex: Nilable<number> = object.getProperty(`defaults.best`) ?? null
    for (const defaultIndex of defaultIndexes) {
      const { data, ...output1 } = GCAComputeDefaults(object, defaultIndex) // compute expression -> trait expression data
      output = mergeMutationInput(output, output1)

      const { bestDefaultIndex: newBestDefaultIndex, ...output2 } = GCAComputeDefaults_Skill(object, defaultIndex, data, bestDefaultIndex) // compute FREE POINTS and BEST DEFAULT
      output = mergeMutationInput(output, output2)

      bestDefaultIndex = newBestDefaultIndex
    }

    if (!isNil(bestDefaultIndex)) output.mutations.push(OVERRIDE(`level.default`, bestDefaultIndex))

    return output
  },
  {
    hashableArguments: { processingStatePath: `score.base.initial` }, //
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`defaultIndex`),
  },
)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`points.base`), SELF_PROPERTY(`defaults.best`), SELF_PROPERTY(`attribute`), SELF_PROPERTY(`level.bonus`)], //
  `GCA:compute:skill:level:value`,
  (object: MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique, GURPSCharacter>) => GCAComputeSkillLevel(object),
)

// #endregion

// #region B.3. Pre-Modifiers Points (Advantages & Disadvantages)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`level.base`), SELF_PROPERTY(`cost.progression`)], //
  `GCA:compute:points:full`,
  (object: MutableObject<RuntimeIGURPSGeneralTrait, GURPSCharacter>) => GCAComputePointsFull(object),
)

// #endregion

// #region B.4. Post-bonus level (Advantages & Disadvantages)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`level.base`), SELF_PROPERTY(`level.bonus`)], //
  `GCA:compute:advantage:level:value`,
  (object: MutableObject<RuntimeIGURPSGeneralTrait, GURPSCharacter>) => GCAComputeAdvantageLevel(object),
)

// #endregion

// #region B.5. Modifiers & Points

// IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
//   [
//     SELF_PROPERTY(/modif1iers\.(\d+).level.value/), //
//     SELF_PROPERTY(/modif1iers\.(\d+).modifier.(progression|expression)/),
//   ], //
//   `GCA:compute:modifier`,
//   (object: MutableObject<RuntimeIGURPSBaseTrait>, { arguments: { modifierIndex, ...args } }) => {
//     let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

//     assert(!isNil(modifierIndex), `Modifier index must be defined`)

//     // 1. Get modifier
//     const modifier = object.getProperty(`modifiers`)[modifierIndex]
//     assert(modifier, `Modifier must be defined`)

//     let value: Nullable<NonUndefined<RuntimeIGURPSModifier[`modifier`][`value`]>> = null

//     const hasExpression = modifier.modifier.expression !== undefined

//     // 2. Try to calculate value through progression
//     if (modifier.modifier.progression) {
//       const level = modifier.level.value
//       assert(level, `Level must be defined`)

//       const progressionValue = getProgressionStep<ProgressionStep>(modifier.modifier.progression, level - 1, { returnObject: true, strictSign: true, dontOverstep: hasExpression })
//       if (progressionValue) {
//         assert(isNumber(progressionValue.value) && !isNaN(progressionValue.value), `Progression value must be a number`)

//         value = new NumericValue(progressionValue.value)

//         // 3. Push mutations
//         if (value) output.mutations.push(SET(`modifiers.${modifierIndex}.modifier.value`, value))
//       }
//     }

//     // (there is NO NEED to schedule a expression listener, since we are already running wherever a RELEVANT DATA (level or expression) is changed)
//     // 4. Try to calculate value through expression if necessary
//     if (!value) {
//       assert(hasExpression, `Expression must be defined`)

//       const { options, environment, trait } = setupProcessing(object)

//       environment.assignValue(`owner`, new ObjectValue(trait))
//       environment.assignValue(`modifierIndex`, new NumericValue(modifierIndex))

//       const path = `modifiers.[${modifierIndex}].modifier.value`

//       const processingOutput = {
//         ...Strategy.process(object, path, {
//           ...options,
//           //
//           expression: modifier.modifier.expression,
//           environment,
//           //
//           syntacticalContext: { mode: `expression` }, // TODO: Probably derive this from "type" of tag in GCA reference
//           reProcessingFunction: `compute:re-processing`,
//         }),
//         path,
//       }

//       // if (processingOutput.state.isReady()) {
//       //   const type = modifier.modifier.type
//       //   const value = processingOutput.state.evaluation!
//       //   debugger
//       // }

//       output = mergeMutationInput(output, processingOutput)
//     }

//     return output
//   },
//   {
//     argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`modifierIndex`),
//   },
// )

// #endregion

//
//
// C. CALCULATE MODES

// #region C.1. Mode Default Traits (a.k.a. SkillsUsed() and CharSkillsUsed())

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(/modes.(\d+).defaults\.(\d+).expression/)], //
  `GCA:compute:mode:defaults`,
  (object: MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique, GURPSCharacter>, { arguments: { modeIndex, defaultIndex, ...args } }) => GCAComputeModeDefaults(object, modeIndex, defaultIndex),
  {
    hashableArguments: { processingStatePath: `score.base.initial` }, //
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`modeIndex`, `defaultIndex`),
  },
)

// #endregion

//
//
// D. CALCULATE GIVING BONUSES

// #region D.1. Task compute:bonus for each target (at bonus origin)

/**
 * GURPS:compute:bonus
 *    - on <source>.level update
 *    - on <origin>.bonuses.<bonusIndex>.* update
 *    - at <targets>.<targetIndex>
 *
 * Probably generate the events on <origin>.bonuses.<bonusIndex>.targets.<targetIndex> update
 *  with value at path being integrity key or somethign
 */

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(/bonuses\.(\d+).targets\.(\d+)/)],
  `GURPS:task:compute:bonus`,
  (
    object: MutableObject<RuntimeIGURPSBaseTrait>,
    { arguments: { bonusIndex, targetIndex, ...args }, executionContext: { eventDispatcher } }, //
  ) => GURPSTaskComputeBonus(object, bonusIndex, targetIndex, eventDispatcher),
  {
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`bonusIndex`, `targetIndex`),
  },
)

// #endregion

// #region D.2. Compute bonuses at target

IMPORT_TRAIT_FROM_GCA_STRATEGY.registerMutationFunction(
  `GURPS:compute:bonus`, //
  (target: MutableObject<RuntimeIGURPSBaseTrait>, { arguments: { origin: originID, bonusIndex, targetIndex, ...args } }) => GURPSComputeBonus(target, originID, bonusIndex, targetIndex),
)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(/level.bonuses/)],
  `GURPS:compute:level:bonus`, //
  (object: MutableObject<RuntimeIGURPSBaseTrait & IGURPSLevelBasedTraitOrModifier>) => GURPSComputeLevelBonus(object),
)

// #endregion
