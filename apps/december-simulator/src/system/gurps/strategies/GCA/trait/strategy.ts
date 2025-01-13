import assert from "assert"
import { AnyObject, NonNil, NonUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { get, isNil, isNumber, isString, merge, set } from "lodash"

import { isNilOrEmpty } from "@december/utils"
import { SELF_PROPERTY } from "@december/utils/access"
import { Mutation, Strategy, IntegrityEntry, SET, MutationInput, mergeMutationInput, MutableObject, OVERRIDE } from "@december/compiler"

import { Environment } from "@december/tree"
import { NumericValue, ObjectValue, StringValue } from "@december/tree/interpreter"

import { GCAGeneralTrait, GCATrait } from "@december/gca"
import { getProgressionIndex, getProgressionStep, ProgressionStep } from "@december/gca/utils/progression"
import { makeGURPSTraitEnvironment, IGURPSBaseTrait, IGURPSGeneralTrait, IGURPSModifier, IGURPSTrait, IGURPSTraitOrModifier, IGURPSAttribute } from "@december/gurps/trait"

import logger, { Block, paint } from "../../../../../logger"
import {
  parseAttribute,
  parseBaseTrait,
  parseEquipment,
  parseGeneralTrait,
  parseSkillOrSpellOrTechnique,
  parseTraitOrModifier,
  RuntimeIGURPSAttribute,
  RuntimeIGURPSBaseTrait,
  RuntimeIGURPSModifier,
  RuntimeIGURPSSkillOrSpellOrTechnique,
  RuntimeIGURPSTrait,
} from "./parsers"
import { GCAStrategyProcessorListenOptions, GCAStrategyProcessorOptionsGenerator, setupProcessing } from "./options"
import GURPSCharacter from "../../../character"

export const IMPORT_TRAIT_FROM_GCA_STRATEGY = new Strategy()

IMPORT_TRAIT_FROM_GCA_STRATEGY.registerReProcessingFunction(`compute:re-processing`, { mode: `expression` }, GCAStrategyProcessorOptionsGenerator, GCAStrategyProcessorListenOptions)

// A. IMPORT FROM GCA
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`_.GCA`)], //
  `GCA:initialize`,
  (object, { executionContext }) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    const gcaTrait = object.data._.GCA as GCATrait

    // 1. Parse traits through all "layers"
    const { traitOrModifier, ...output1 } = parseTraitOrModifier(object, gcaTrait)
    output = mergeMutationInput(output, output1)

    assert(traitOrModifier.type !== `modifier`, `GCA trait must be a trait, not a modifier`)
    const { baseTrait, ...output2 } = parseBaseTrait(object, gcaTrait, traitOrModifier as IGURPSTraitOrModifier<IGURPSBaseTrait[`type`]>)
    output = mergeMutationInput(output, output2)

    let trait: RuntimeIGURPSTrait = baseTrait as any

    // if (object.id === `11182`) debugger // Carry something trait
    // if (object.id === `11233`) debugger // ST:Lifting ST
    // if (object.id === `11301`) debugger // ST:ST

    // 3. Parse specifics
    if (baseTrait.type === `attribute` && gcaTrait.section === `attributes`) {
      const { trait: attribute, ...output3 } = parseAttribute(object, gcaTrait, baseTrait as RuntimeIGURPSBaseTrait<`attribute`>)
      output = mergeMutationInput(output, output3)

      trait = attribute
    } else if ((baseTrait.type === `skill` && gcaTrait.section === `skills`) || (baseTrait.type === `spell` && gcaTrait.section === `spells`)) {
      const { trait: skill, ...output3 } = parseSkillOrSpellOrTechnique(object, gcaTrait, baseTrait as RuntimeIGURPSBaseTrait<`skill` | `spell`>)
      output = mergeMutationInput(output, output3)

      trait = skill
    } else if (baseTrait.type === `equipment` && gcaTrait.section === `equipment`) {
      const { trait: equipment, ...output3 } = parseEquipment(object, gcaTrait, baseTrait as RuntimeIGURPSBaseTrait<`equipment`>)
      output = mergeMutationInput(output, output3)

      trait = equipment
    } else {
      const { trait, ...output3 } = parseGeneralTrait(object, gcaTrait as GCAGeneralTrait, baseTrait as RuntimeIGURPSBaseTrait<IGURPSGeneralTrait[`type`]>)
      output = mergeMutationInput(output, output3)
    }

    // 2. Push object structure as mutations
    for (const [key, value] of Object.entries(trait)) output.mutations.push(SET(key, value))

    return output
  },
)

// B. Calculate Levels/Points/Values/Scores/etc...

// B.1. Base Score (Attributes)
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`score.base.source`)], //
  `GCA:compute:score:initial`,
  (object: MutableObject<RuntimeIGURPSAttribute, GURPSCharacter>) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    // 1. Get base source
    const baseSource = object.getProperty(`score.base.source`)
    assert(!isNilOrEmpty(baseSource), `Default notation must be defined`)

    // 2. Process source
    const { options, environment } = setupProcessing(object)

    // if (object.id === `11270`) debugger
    // if (object.id === `11285`) debugger
    // if (object.id === `11325`) debugger // ST:TK Basic Lift

    const processingOutput = Strategy.process(object, `score.base.initial`, {
      ...options,
      //
      expression: baseSource,
      environment,
      //
      syntacticalContext: { mode: `expression` },
      reProcessingFunction: `GCA:compute:score:initial`,
    })

    output = mergeMutationInput(output, processingOutput)
    return output
  },
  { hashableArguments: { processingStatePath: `score.base.initial` } },
)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`score.base.initial`), SELF_PROPERTY(`cost.increment.value`), SELF_PROPERTY(`cost.decrement.value`)], //
  `GCA:compute:score:base`,
  (object: MutableObject<RuntimeIGURPSAttribute, GURPSCharacter>) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    // BASE_SCORE = INITIAL_SCORE + BOUGHT_SCORE

    // 1. Get attribute
    const attribute = object.getData()
    const basePoints = attribute.points.base
    const stepFactor = attribute.cost.step

    // 2. Get initial score
    const initialScore = object.getProperty(`score.base.initial`)
    if (!initialScore) return output // initial score not ready, bail out

    // 3. Process increment/decrement
    let steps: number = 0
    if (basePoints > 0) {
      if (`progression` in attribute.cost.increment) steps = getProgressionIndex(attribute.cost.increment.progression, basePoints, {}) + 1
      else debugger
    } else if (basePoints < 0) {
      if (`progression` in attribute.cost.decrement) steps = getProgressionIndex(attribute.cost.decrement.progression, basePoints, { reverse: true }) - 1
      else debugger
    }

    // if (object.id === `11176`) debugger

    // 2. Calculate bought score
    //      BOUGHT_SCORE = (BASE_POINTS / (UP, DOWN)) * STEP
    if (steps > 0) assert(stepFactor !== 0, `Step factor must not be 0`)
    const boughtScore = steps === 0 ? 0 : steps * stepFactor

    // 3. Calculate final base score
    const baseScore = initialScore.value + boughtScore
    assert(isNumber(baseScore) && !isNaN(baseScore), `Base Score value must be a number`)

    output.mutations.push(OVERRIDE(`score.base.value`, baseScore))
    return output
  },
)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`score.base.value`)], //
  `GCA:compute:score:value`,
  (object: MutableObject<RuntimeIGURPSAttribute, GURPSCharacter>) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    // BASE_SCORE = INITIAL_SCORE + BOUGHT_SCORE

    // 1. Get attribute
    const attribute = object.getData()
    const baseScore = attribute.score.base.value
    assert(!isNil(baseScore), `Base score must be defined`)

    const extraScore = 0

    // 2. Calculate score value
    const score = baseScore + extraScore
    assert(isNumber(score) && !isNaN(score), `Score value must be a number`)

    const roundedScore = attribute.cost.round === `up` ? Math.ceil(score) : attribute.cost.round === `down` ? Math.floor(score) : score

    // if (object.id === `11228`) debugger
    // if (object.id === `11338`) debugger // ST:TK ST
    // if (object.id === `11359`) debugger

    output.mutations.push(OVERRIDE(`score.value`, roundedScore))
    output.mutations.push(OVERRIDE(`level.value`, roundedScore))
    return output
  },
)

// B.2. Default Level (skills)
// IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
//   [SELF_PROPERTY(/level.defaults\.(\d+).expression/)], //
//   `GCA:compute:default_level`,
//   (object: MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique>, { arguments: { defaultIndex, ...args } }) => {
//     let output: MutationInput = { mutations: [], integrityEntries: [] }

//     assert(!isNil(defaultIndex), `Default index must be defined`)

//     // 1. Get default notation
//     const defaultNotation = object.getProperty(`level.defaults`)?.[defaultIndex]
//     assert(defaultNotation, `Default notation must be defined`)

//     debugger

//     return output
//   },
//   {
//     argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`defaultIndex`),
//   },
// )

// B.1. Modifiers
IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [
    SELF_PROPERTY(/modif1iers\.(\d+).level.value/), //
    SELF_PROPERTY(/modif1iers\.(\d+).modifier.(progression|expression)/),
  ], //
  `GCA:compute:modifier`,
  (object: MutableObject<RuntimeIGURPSBaseTrait>, { arguments: { modifierIndex, ...args } }) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    assert(!isNil(modifierIndex), `Modifier index must be defined`)

    // 1. Get modifier
    const modifier = object.getProperty(`modifiers`)[modifierIndex]
    assert(modifier, `Modifier must be defined`)

    let value: Nullable<NonUndefined<RuntimeIGURPSModifier[`modifier`][`value`]>> = null

    const hasExpression = modifier.modifier.expression !== undefined

    // 2. Try to calculate value through progression
    if (modifier.modifier.progression) {
      const level = modifier.level.value
      assert(level, `Level must be defined`)

      const progressionValue = getProgressionStep<ProgressionStep>(modifier.modifier.progression, level - 1, { returnObject: true, strictSign: true, dontOverstep: hasExpression })
      if (progressionValue) {
        assert(isNumber(progressionValue.value) && !isNaN(progressionValue.value), `Progression value must be a number`)

        value = new NumericValue(progressionValue.value)

        // 3. Push mutations
        if (value) output.mutations.push(SET(`modifiers.${modifierIndex}.modifier.value`, value))
      }
    }

    // (there is NO NEED to schedule a expression listener, since we are already running wherever a RELEVANT DATA (level or expression) is changed)
    // 4. Try to calculate value through expression if necessary
    if (!value) {
      assert(hasExpression, `Expression must be defined`)

      const { options, environment, trait } = setupProcessing(object)

      environment.assignValue(`owner`, new ObjectValue(trait))
      environment.assignValue(`modifierIndex`, new NumericValue(modifierIndex))

      const path = `modifiers.[${modifierIndex}].modifier.value`

      const processingOutput = {
        ...Strategy.process(object, path, {
          ...options,
          //
          expression: modifier.modifier.expression,
          environment,
          //
          syntacticalContext: { mode: `expression` }, // TODO: Probably derive this from "type" of tag in GCA reference
          reProcessingFunction: `compute:re-processing`,
        }),
        path,
      }

      // if (processingOutput.state.isReady()) {
      //   const type = modifier.modifier.type
      //   const value = processingOutput.state.evaluation!
      //   debugger
      // }

      output = mergeMutationInput(output, processingOutput)
    }

    return output
  },
  {
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`modifierIndex`),
  },
)
