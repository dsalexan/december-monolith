import assert from "assert"
import { AnyObject, Arguments, MaybeUndefined, Nilable, NonNil, NonUndefined, Nullable, WithOptionalKeys } from "tsdef"
import { get, isEmpty, isNil, isNumber, isString, merge, range, set } from "lodash"

import { isNilOrEmpty } from "@december/utils"
import { PROPERTY, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"
import { Mutation, Strategy, IntegrityEntry, SET, MutationInput, mergeMutationInput, MutableObject, OVERRIDE } from "@december/compiler"

import { Environment } from "@december/tree"
import { BooleanValue, NumericValue, ObjectValue, RuntimeValue, StringValue } from "@december/tree/interpreter"

import { GCAGeneralTrait, GCATrait } from "@december/gca"
import { getProgressionIndex, getProgressionStep, ProgressionStep } from "@december/gca/utils/progression"
import { makeGURPSTraitEnvironment, IGURPSBaseTrait, IGURPSGeneralTrait, IGURPSModifier, IGURPSTrait, IGURPSTraitOrModifier, IGURPSAttribute, isAlias, Type, IGURPSSkillOrSpellOrTechnique } from "@december/gurps/trait"

import logger, { Block, paint } from "../../../../../logger"

import { parseAttribute, parseBaseTrait, parseEquipment, parseGeneralTrait, parseSkillOrSpellOrTechnique, parseTraitOrModifier } from "./parsers"
import { RuntimeIGURPSAttribute, RuntimeIGURPSBaseTrait, RuntimeIGURPSGeneralTrait, RuntimeIGURPSModifier, RuntimeIGURPSSkillOrSpellOrTechnique, RuntimeIGURPSTrait } from "./runtime"

import { GCAStrategyProcessorListenOptions, GCAStrategyProcessorOptionsGenerator, setupProcessing } from "./options"
import GURPSCharacter from "../../../character"

import { createTransformNodeEntry } from "@december/tree/parser"
import { EQUALS } from "@december/utils/match/element"
import { calcProgressionCost, calcProgressionStep } from "@december/gurps/trait/definitions/cost"
import { makeArtificilEventDispatcher, PROPERTY_UPDATED, REFERENCE_ADDED } from "@december/compiler/controller/eventEmitter/event"
import { IGURPSBonus } from "@december/gurps/trait/bonus"
import { MERGE } from "@december/compiler/mutation/mutation"
import { IGURPSLevelBasedTraitOrModifier } from "@december/gurps/trait/definitions/generic"

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
      const { trait: skill, ...output3 } = parseSkillOrSpellOrTechnique(object, gcaTrait, baseTrait as RuntimeIGURPSBaseTrait<`skill` | `spell` | `technique`>)
      output = mergeMutationInput(output, output3)

      trait = skill
    } else if (baseTrait.type === `equipment` && gcaTrait.section === `equipment`) {
      const { trait: equipment, ...output3 } = parseEquipment(object, gcaTrait, baseTrait as RuntimeIGURPSBaseTrait<`equipment`>)
      output = mergeMutationInput(output, output3)

      trait = equipment
    } else {
      const { trait: generalTrait, ...output3 } = parseGeneralTrait(object, gcaTrait as GCAGeneralTrait, baseTrait as RuntimeIGURPSBaseTrait<IGURPSGeneralTrait[`type`]>)
      output = mergeMutationInput(output, output3)

      trait = generalTrait
    }

    // 2. Append object structure as mutations
    const mutations: MutationInput[`mutations`] = []
    for (const [key, value] of Object.entries(trait)) mutations.push(SET(key, value))
    output.mutations.unshift(...mutations)

    return output
  },
)

//
//
// B. CALCULATE MAIN VALUES (Scores, Levels, Points)

// #region B.1. Score (Attributes)

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
    // if (object.id === `11176`) debugger // ST:Basic Speed

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

    // if (object.id === `11361`) debugger // ST:Will

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

    // if (object.id === `11176`) debugger // ST:Basic Speed

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
    // if (object.id === `11193`) debugger // ST:DX
    // if (object.id === `11226`) debugger // ST:HT
    // if (object.id === `11228`) debugger // ST:IQ
    // if (object.id === `11361`) debugger // ST:Will

    output.mutations.push(OVERRIDE(`score.value`, roundedScore))
    output.mutations.push(OVERRIDE(`level.value`, roundedScore))
    return output
  },
)

// #endregion

// #region B.2. Level (Skills, Spells and Techniques)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(/level.defaults\.(\d+).expression/), SELF_PROPERTY(`cost`), SELF_PROPERTY(`attribute`)], //
  `GCA:compute:level:defaults`,
  (object: MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique, GURPSCharacter>, { arguments: { defaultsIndex, ...args } }) => {
    // TODO: aggregate any enqueueing by DEFAULTS_INDEX into COST/ATTRIBUTE

    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }
    if (object.data.type !== `skill`) return output

    const levelDefaults = object.data.level.defaults ?? []
    if (levelDefaults.length === 0) return output

    const targetDefaultIndexes = defaultsIndex !== undefined ? [defaultsIndex] : range(levelDefaults.length)

    // if (object.id === `11270`) debugger
    // if (object.id === `15064` && defaultsIndex === 2) debugger // SK:First Aid
    // if (object.id === `12889`) debugger // SK:Physician
    // if (object.id === `15064`) debugger // SK:First Aid

    // 1. Get attribute score
    const attributeAlias = object.getProperty(`attribute`)
    const attributes = object.controller.store.getByReference(new Reference(`alias`, attributeAlias), false) as MutableObject<RuntimeIGURPSAttribute>[]
    assert(attributes.length === 1, `Exactly one attribute must be found by alias`)

    const [attribute] = attributes
    const attributeLevel = attribute.getProperty(`level.value`)
    if (attributeLevel === undefined) return output

    let bestDefaultIndex: Nilable<number> = object.getProperty(`level.default`) ?? null
    for (const defaultsIndex of targetDefaultIndexes) {
      if (object.id === `15064` && defaultsIndex === 2) debugger // SK:First Aid

      // 2. Get defaults expression
      const cost = object.getProperty(`cost`)
      const expression = object.getProperty(`level.defaults.${defaultsIndex}.expression`) as string
      assert(!isNilOrEmpty(expression), `Default expression must be defined`)

      // 3. Process source
      const { options, environment } = setupProcessing(object)

      const processingOutput = Strategy.process(object, `level.defaults.${defaultsIndex}.value`, {
        ...options,
        //
        expression,
        environment,
        //
        syntacticalContext: { mode: `expression` },
        reProcessingFunction: { name: `GCA:compute:level:defaults`, hashableArguments: { defaultsIndex } },
      })

      // 4. Get relevant trait (attribute or skill)
      const aliases: string[] = []
      const variables = processingOutput.state.symbolTable.getAllVariables(processingOutput.state.environment!)
      for (const symbol of variables) {
        const variableName = symbol.variableName
        if (isAlias(variableName)) aliases.push(variableName)
      }

      assert(aliases.length <= 1, `Exactly one alias must be defined`)

      // 4. Check if trait is KNOWN (i.e. attribute or known skill)
      const alias = aliases[0]
      const traits = alias === undefined ? [] : (object.controller.store.getByReference(new Reference(`alias`, alias), false) as MutableObject<RuntimeIGURPSTrait>[])
      assert(traits.length <= 1, `Exactly one trait must be found by alias`)

      const trait = traits[0] as MaybeUndefined<MutableObject<RuntimeIGURPSTrait>>
      const type = trait ? trait.getProperty(`type`) : `∄`

      let isKnown: boolean
      if (type === `∄`) isKnown = false
      else if (type === `attribute`) isKnown = true
      else if (type === `skill`) {
        const basePoints = (trait as MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique>).getProperty(`points.base`)
        isKnown = basePoints > 0
      }

      assert(!isNil(isKnown!), `isKnown must be defined`)

      // 5. Calculate "free" points gained by defaulting to this level
      if (isKnown && processingOutput.state.isReady()) {
        const level = processingOutput.state.getValue() as NumericValue
        const levelDifference = level.value - attributeLevel

        const freePoints = calcProgressionCost(cost, levelDifference)
        output.mutations.push(OVERRIDE(`level.defaults.${defaultsIndex}.points`, Math.max(freePoints, 0)))

        // (can only be a best default if there are free points gained by defaulting to this level)
        if (freePoints > 0) {
          //      (check if this is new best default)

          // 5. If there is no CURRENT DEFAULT (aka BEST DEFAULT), set this as default (only if processing is ready)
          if (isNil(bestDefaultIndex)) bestDefaultIndex = defaultsIndex
          // 6. If there is a currently best default, check it against this to choose bestest overall
          else {
            const currentDefault = object.getProperty(`level.defaults.${bestDefaultIndex}`) as MaybeUndefined<NonNil<RuntimeIGURPSSkillOrSpellOrTechnique[`level`][`defaults`]>[0]>
            assert(currentDefault, `Current default must be defined`)

            const currentFreePoints = currentDefault.points
            if (!isNil(currentFreePoints)) {
              if (freePoints > currentFreePoints) bestDefaultIndex = defaultsIndex
            }
          }
        }
      }

      // 5. Push mutations
      output.mutations.push(OVERRIDE(`level.defaults.${defaultsIndex}.trait`, alias))
      output.mutations.push(OVERRIDE(`level.defaults.${defaultsIndex}.isKnown`, isKnown))

      output = mergeMutationInput(output, processingOutput)
    }

    if (!isNil(bestDefaultIndex)) output.mutations.push(OVERRIDE(`level.default`, bestDefaultIndex))

    return output
  },
  { hashableArguments: { processingStatePath: `score.base.initial` }, argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`defaultsIndex`) },
)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`points.base`), SELF_PROPERTY(`level.default`), SELF_PROPERTY(`attribute`), SELF_PROPERTY(`level.bonus`)], //
  `GCA:compute:skill:level:value`,
  (object: MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique, GURPSCharacter>) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }
    if (object.data.type !== `skill`) return output
    if (object.data.children.length > 0) return output

    // if (object.id === `12943`) debugger // SK:Meditation
    // if (object.id === `15064`) debugger // SK:First Aid

    // LEVEL =  DEFAULT_LEVEL  + BOUGHT_LEVEL
    //       = ATTRIBUTE_LEVEL + BOUGHT_LEVEL

    // 1. Get attribute level
    const attributeAlias = object.getProperty(`attribute`)
    const attributes = object.controller.store.getByReference(new Reference(`alias`, attributeAlias), false) as MutableObject<RuntimeIGURPSAttribute>[]
    assert(attributes.length === 1, `Exactly one attribute must be found by alias`)

    const [attribute] = attributes
    const attributeLevel = attribute.getProperty(`level.value`)
    if (attributeLevel === undefined) return output

    // 2. Calculate level through attribute
    let baseLevel = attributeLevel
    let freePoints: number = 0
    let base: IGURPSSkillOrSpellOrTechnique[`level`][`base`] = { type: `attribute`, level: attributeLevel }

    const defaultIndex = object.getProperty(`level.default`)
    if (defaultIndex === undefined) {
      // pass
    }
    // 3. Calculate level through default
    else {
      base = { type: `default`, index: defaultIndex! }

      const defaults = object.getProperty(`level.defaults.${defaultIndex}`) as MaybeUndefined<NonNil<RuntimeIGURPSSkillOrSpellOrTechnique[`level`][`defaults`]>[0]>
      assert(defaults, `Default must be defined`)

      freePoints = defaults.points!
      assert(freePoints !== undefined, `Free points must be defined`)
    }

    // 3. Effectively calculate level
    const cost = object.getProperty(`cost`)

    const basePoints = object.getProperty(`points.base`)
    const points = basePoints + freePoints

    const boughtLevel = calcProgressionStep(cost, points)
    assert(isNumber(boughtLevel) && !isNaN(boughtLevel), `Bought level must be a number`)

    const bonusLevel = object.getProperty(`level.bonus`)
    assert(bonusLevel === undefined || (isNumber(bonusLevel) && !isNaN(bonusLevel)), `Bonus must be a number`)

    if (bonusLevel! > 0) debugger

    const level = baseLevel + boughtLevel + (bonusLevel ?? 0)

    assert(isNumber(level) && !isNaN(level), `Level value must be a number`)

    // if (object.id === `11228`) debugger

    output.mutations.push(OVERRIDE(`level.bought`, boughtLevel))
    output.mutations.push(OVERRIDE(`level.base`, base))
    output.mutations.push(OVERRIDE(`level.value`, level))

    return output
  },
)

// #endregion

// #region B.3. Pre-Modifiers Points (Advantages & Disadvantages)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`level.base`), SELF_PROPERTY(`cost.progression`)], //
  `GCA:compute:points:full`,
  (object: MutableObject<RuntimeIGURPSGeneralTrait, GURPSCharacter>) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }
    if ([`skill`, `spell`, `technique`].includes(object.data.type)) return output
    if (object.getProperty(`childProfile`) !== `regular`) return output

    // if (object.id === `15064`) debugger // SK:First Aid

    // TODO: Make sure this does not impair cost calculation by formula

    // 1. Get necessary data
    const cost = object.getProperty(`cost.progression`)
    assert(cost, `Cost must be defined`)

    const baseLevel = object.getProperty(`level.base`)
    assert(baseLevel, `Base level must be defined`)

    // 2. Calculate points
    //      POINTS = BASE_LEVEL * COST
    const points = getProgressionStep(cost, baseLevel - 1)

    output.mutations.push(OVERRIDE(`points.full`, points))
    return output
  },
)

// #endregion

// #region B.4. Post-bonus level (Advantages & Disadvantages)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(`level.base`), SELF_PROPERTY(`level.bonus`)], //
  `GCA:compute:advantage:level:value`,
  (object: MutableObject<RuntimeIGURPSGeneralTrait, GURPSCharacter>) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }
    if (![`advantage`, `disadvantage`].includes(object.data.type)) return output
    if (object.data.children.length > 0) return output

    // if (object.id === `12943`) debugger // SK:Meditation
    // if (object.id === `15064`) debugger // SK:First Aid

    // 1. Effectively calculate level
    const baseLevel = object.getProperty(`level.base`)

    const bonusLevel = object.getProperty(`level.bonus`)
    assert(bonusLevel === undefined || (isNumber(bonusLevel) && !isNaN(bonusLevel)), `Bonus must be a number`)

    const level = baseLevel + (bonusLevel ?? 0)

    assert(isNumber(level) && !isNaN(level), `Level value must be a number`)

    // if (object.id === `11228`) debugger

    output.mutations.push(OVERRIDE(`level.value`, level))

    return output
  },
)

// #endregion

// #region B.5. Modifiers & Points

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

// #endregion

//
//
// C. CALCULATE MODES

// #region C.1. Mode Skills (a.k.a. SkillsUsed() and CharSkillsUsed())

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [
    SELF_PROPERTY(/modes\.(\d+).skills\.(\d+)\.expression/), //
  ], //
  `GCA:compute:mode:skills`,
  (object: MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique, GURPSCharacter>, { arguments: { modeIndex, skillIndex, ...args } }) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    assert(!isNil(modeIndex) && isNumber(modeIndex) && !isNaN(modeIndex), `Mode index must be defined`)
    assert(!isNil(skillIndex) && isNumber(skillIndex) && !isNaN(skillIndex), `Skill index must be defined`)

    // 1. Get skill notation
    const mode = object.getProperty(`modes`)[modeIndex]
    assert(mode, `Mode must be defined`)

    const expression = mode.skills?.[skillIndex].expression
    assert(!isNilOrEmpty(expression), `Skill expression must be defined`)

    // 2. Process source
    const { options, environment } = setupProcessing(object)

    const processingOutput = Strategy.process(object, `modes.${modeIndex}.skills.${skillIndex}.value`, {
      ...options,
      //
      expression,
      environment,
      //
      syntacticalContext: { mode: `expression` },
      reProcessingFunction: { name: `GCA:compute:mode:skills`, hashableArguments: { modeIndex, skillIndex } },
    })

    // 3. Get relevant trait (attribute or skill)
    const aliases: string[] = []
    const variables = processingOutput.state.symbolTable.getAllVariables(processingOutput.state.environment!)
    for (const symbol of variables) {
      const variableName = symbol.variableName
      if (isAlias(variableName)) aliases.push(variableName)
    }

    assert(aliases.length <= 1, `Exactly one alias must be defined`)

    // 4. Check if trait is KNOWN (i.e. attribute or known skill)
    const alias = aliases[0]
    const traits = alias === undefined ? [] : (object.controller.store.getByReference(new Reference(`alias`, alias), false) as MutableObject<RuntimeIGURPSTrait>[])
    assert(traits.length <= 1, `Exactly one trait must be found by alias`)

    debugger

    return output
  },
  {
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`modeIndex`, `skillIndex`),
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
  (object: MutableObject<RuntimeIGURPSBaseTrait>, { arguments: { bonusIndex, targetIndex, ...args }, executionContext: { eventDispatcher } }) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    assert(!isNil(bonusIndex) && isNumber(bonusIndex) && !isNaN(bonusIndex), `Bonus index must be defined`)
    assert(!isNil(targetIndex) && isNumber(targetIndex) && !isNaN(targetIndex), `Target index must be defined`)

    const path = `bonuses.${bonusIndex}.targets.${targetIndex}`

    assert(eventDispatcher.type === `property:updated`, `Event must be property:updated`)
    const previousTarget = get(object.previousData, path) as RuntimeIGURPSBaseTrait[`bonuses`][0][`targets`][0]

    const bonus = object.getProperty(`bonuses`)[bonusIndex]
    const currentTarget = bonus.targets[targetIndex]

    // 1. Compare current targets vs previous, and remove given bonuses for "missing" targets
    const targetChanged = previousTarget.trait !== currentTarget.trait || previousTarget.tag !== currentTarget.tag
    assert(!targetChanged, `Not implemented`)

    const integrityEntryAlreadyExists = object.controller.integrityRegistry.has(path)

    //    (no need to re-listen if target is the same AND integrity entry already exists for that same target that remained the same)
    if (integrityEntryAlreadyExists && !targetChanged) return output

    // 2. Change integrity entry (with new value)
    const integrityValue = `${currentTarget.trait}|${currentTarget.tag}`
    const integrityEntry = object.makeIntegrityEntry(`bonuses.${bonusIndex}.targets.${targetIndex}`, integrityValue)
    output.integrityEntries.push(integrityEntry)

    // 3. Create listener to compute bonus

    // Strategy.addProxyListener(PROPERTY_UPDATED(PROPERTY(REFERENCE(`alias`, attribute), EQUALS(`level.value`))), `GCA:compute:level:defaults`)(object)

    // 3.A. Create event pointing to target and source
    const sourceReference = bonus.source.trait.toLowerCase() === `me` ? new Reference(`id`, object.id) : new Reference(`alias`, bonus.source.trait)
    const sourceProperty = bonus.source.tag === `default` ? `level.value` : bonus.source.tag

    const targetReference = currentTarget.trait.toLowerCase() === `me` ? new Reference(`id`, object.id) : new Reference(`alias`, currentTarget.trait)
    const targetProperty = currentTarget.tag === `default` ? `level.value` : currentTarget.tag

    const originReference = new Reference(`id`, object.id)

    const event = PROPERTY_UPDATED(
      PROPERTY(sourceReference, EQUALS(sourceProperty)), // on source update
      // on origin > bonus update
      PROPERTY(originReference, EQUALS(`bonuses.${bonusIndex}.bonus.value`)),
      PROPERTY(originReference, EQUALS(`bonuses.${bonusIndex}.maximum.value`)),
      PROPERTY(originReference, EQUALS(`bonuses.${bonusIndex}.unless.expression`)),
      PROPERTY(originReference, EQUALS(`bonuses.${bonusIndex}.onlyIf.expression`)),
    )

    // 3.B. Add listener (and queue it once)
    Strategy.addProxyListener(
      event,
      `GURPS:compute:bonus`,
      {
        hashableArguments: {
          origin: object.id,
          bonusIndex,
          targetIndex,
        },
      },
      {
        targetObjectReference: targetReference,
        origin: { frame: `GURPS:task:compute:bonus` },
      },
    )(object)

    return output
  },
  {
    argumentProvider: Strategy.argumentProvider_PropertyUpdatedRegexIndexes(`bonusIndex`, `targetIndex`),
  },
)

// #endregion

// #region D.2. Compute bonuses at target

IMPORT_TRAIT_FROM_GCA_STRATEGY.registerMutationFunction(
  `GURPS:compute:bonus`, //
  (target: MutableObject<RuntimeIGURPSBaseTrait>, { arguments: { origin: originID, bonusIndex, targetIndex, ...args } }) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    // 1. Access bonus data
    assert(!isNil(originID) && isString(originID) && !isEmpty(originID), `Origin (object id) must be defined`)
    assert(!isNil(bonusIndex) && isNumber(bonusIndex) && !isNaN(bonusIndex), `Bonus index must be defined`)
    assert(!isNil(targetIndex) && isNumber(targetIndex) && !isNaN(targetIndex), `Target index must be defined`)

    const origin = target.controller.store.getByID(originID) as MutableObject<RuntimeIGURPSBaseTrait>
    assert(origin, `Origin must be found`)

    const originalBonusNotation = get(origin.data, `_.GCA.gives`)
    const bonus = origin.getProperty(`bonuses`)[bonusIndex]

    // 2. Check exceptions
    const unless = bonus.unless
    const onlyIf = bonus.onlyIf
    if (unless || onlyIf) debugger

    // 3. Calculate bonus value
    assert(bonus.bonus.value !== undefined, `Bonus value must be defined`)
    let value = bonus.bonus.value.asNumber()

    // 4. Apply bonus (byMode and maximum if necessary)
    if (bonus.byMode) debugger
    if (bonus.maximum) debugger

    // 5. Register bonus level
    if (bonus.singleBonus) debugger

    const bonusKey = `${origin.id}_${bonusIndex}_${targetIndex}`
    output.mutations.push(MERGE(`level.bonuses`, { [bonusKey]: value }))

    return output
  },
)

IMPORT_TRAIT_FROM_GCA_STRATEGY.onPropertyUpdatedEnqueue(
  [SELF_PROPERTY(/level.bonuses/)],
  `GURPS:compute:level:bonus`, //
  (object: MutableObject<RuntimeIGURPSBaseTrait & IGURPSLevelBasedTraitOrModifier>) => {
    let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

    const bonuses = object.getProperty(`level.bonuses`)
    assert(bonuses, `Bonuses must be defined`)

    let bonusLevel = 0
    for (const [key, value] of Object.entries(bonuses)) bonusLevel += value

    output.mutations.push(OVERRIDE(`level.bonus`, bonusLevel))

    return output
  },
)

// #endregion

//
//
//
//
//
