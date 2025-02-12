import assert from "assert"
import { get, isEmpty, isNil, isNumber, isString, uniq } from "lodash"
import { Arguments, MaybeUndefined, Nilable, NonNil, Nullable } from "tsdef"

import { isNilOrEmpty, removeUndefinedKeys, split } from "@december/utils"
import { EQUALS } from "@december/utils/match/element"
import { PROPERTY, Reference } from "@december/utils/access"

import { BinaryExpression, Expression, ExpressionList, ExpressionStatement, Identifier, MemberExpression } from "@december/tree/tree"
import { createTransformNodeEntry } from "@december/tree/parser"
import { BooleanValue, NumericValue, StringValue } from "@december/tree/interpreter"

import { mergeMutationInput, MutableObject, MutationInput, OVERRIDE, SET, MERGE, Strategy } from "@december/compiler"
import { StrategyProcessorParseOptions, StrategyProcessState } from "@december/compiler/controller/strategy/processor"
import { Event, EventDispatcher, PROPERTY_UPDATED } from "@december/compiler/controller/eventEmitter/event"

import { Trait, Utils } from "@december/gurps"
import { aliasToReference, getAliases, IGURPSBaseTrait, IGURPSModifier, IGURPSSkillOrSpellOrTechnique, IGURPSTraitDefaults, IGURPSTraitExpression, IGURPSTraitOrModifier, isAlias, Type } from "@december/gurps/trait"
import { IGURPSLevelBasedTraitOrModifier } from "@december/gurps/trait/definitions/generic"
import { GCABonusExpression, IGURPSBonus, RuntimeIGURPSBonus } from "@december/gurps/trait/bonus"
import { calcProgressionStep } from "@december/gurps/trait/definitions/cost"

import { GCAMode, GCAModifier, GCATrait } from "@december/gca"
import { getProgressionType } from "@december/gca/utils/progression"

import GURPSCharacter from "../../../../character"
import { RuntimeIGURPSAttribute, RuntimeIGURPSBaseTrait, RuntimeIGURPSMode, RuntimeIGURPSModifier, RuntimeIGURPSSkillOrSpellOrTechnique, RuntimeIGURPSTrait, RuntimeIGURPSTraitDefaults } from "../runtime"
import { setupProcessing } from "../options"

export function GCAInitialize_TraitOrModifier(id: number | string, gca: GCATrait | GCAModifier): MutationInput & { traitOrModifier: IGURPSTraitOrModifier } {
  const output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  const children: string[] = !isNilOrEmpty(gca.childKeyList) ? split(gca.childKeyList).filter(id => id !== ``) : []

  const isParent = children.length > 0
  const isAttribute = gca.section === `attributes` // some attributes are not explicitly specified in the books
  const isModifier = gca.section === `modifiers` // some modifiers are not explicitly specified in the books
  const ignore = [`_Free`, `_List`, `Smell Only`, `Alternate Form`].includes(gca.name)

  if (!isParent && !isAttribute && !isModifier && !ignore) assert(!isNil(gca.page), `GCA trait must have a "page" property`)
  if (gca.group && gca.group.includes(`,`)) debugger // TODO: Handle multiple groups

  const mods = isNil(gca.mods) ? undefined : split(gca.mods)

  // 2. Build BASE (aka "traits-and-modifiers", really basic shit for traits {and modifiers, but we don't get modifiers directly here})
  const traitOrModifier: IGURPSTraitOrModifier = {
    id: id.toString(),
    type: Type.fromGCASection(gca.section),
    children,
    //
    name: gca.name,
    nameExtension: gca.nameExt,
    description: gca.description,
    //
    reference: !isNil(gca.page) ? Utils.parsePageNotation(gca.page) : null,
    //
    group: gca.group,
    mods,
  }

  removeUndefinedKeys(traitOrModifier)

  // if (id === 11193) debugger // ST:DX

  // 2. Build aliases
  if (gca.section !== `modifiers`) {
    const aliases = getAliases(traitOrModifier.type, traitOrModifier.name, { nameExtension: traitOrModifier.nameExtension, group: traitOrModifier.group })
    output.mutations.push(OVERRIDE(`__.aliases`, aliases))
  }

  return { ...output, traitOrModifier }
}

export function GCAInitialize_BaseTrait(object: MutableObject, gca: GCATrait, traitOrModifier: IGURPSTraitOrModifier<IGURPSBaseTrait[`type`]>): MutationInput & { baseTrait: RuntimeIGURPSBaseTrait } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  let notes: IGURPSBaseTrait[`notes`] = undefined
  if (!isNilOrEmpty(gca.itemNotes) || !isNilOrEmpty(gca.userNotes)) {
    notes ??= {}

    if (!isNilOrEmpty(gca.itemNotes)) notes!.short = split(gca.itemNotes)
    if (!isNilOrEmpty(gca.userNotes)) notes!.long = split(gca.userNotes)
  }

  // 2. Build BASE_TRAIT
  const baseTrait: RuntimeIGURPSBaseTrait = {
    ...traitOrModifier,
    // cost: null as any,
    //
    childProfile: gca.childProfile === 1 ? `alternative-attacks` : gca.childProfile === 2 ? `apply-modifiers-to-children` : `regular`,
    //
    notes,
    //
    modes: [],
    modifiers: [],
    bonuses: [],
    //
    radius: 0,
  }

  removeUndefinedKeys(baseTrait)

  // 3. Parse modes
  const modes = gca.modes
  if (modes && modes.length > 0) {
    for (const [modeIndex, gcaMode] of modes.entries()) {
      const { mode, ...output1 } = GCAInitialize_Mode(object, gcaMode, modeIndex)

      baseTrait.modes.push(mode)
      output = mergeMutationInput(output, output1)
    }
  }

  // 4. Parse modifiers
  const step1 = gca.modifiers.map((gca, i) => ({ gca, ...GCAInitialize_TraitOrModifier(`${object.id}_mode${i}`, gca) }))
  const step2 = step1.map(({ gca, traitOrModifier }) => GCAInitialize_Modifier(object, gca, traitOrModifier as IGURPSTraitOrModifier<`modifier`>))
  for (const { modifier, ...output1 } of step2) {
    baseTrait.modifiers.push(modifier)
    output = mergeMutationInput(output, output1)
  }

  // 5. Parse bonuses (from Gives() and Conditional())
  const gives = gca.gives
  if (gives && !isNilOrEmpty(gives)) {
    const { bonuses, outputs } = GCAInitialize_Bonus(object, `__.gives`, gives)
    for (const bonus of bonuses) baseTrait.bonuses.push(bonus)
    for (const output1 of outputs) output = mergeMutationInput(output, output1)
  }

  const conditional = gca.conditional
  if (conditional && !isNilOrEmpty(conditional)) {
    const { bonuses, outputs } = GCAInitialize_Bonus(object, `__.conditional`, conditional, true)
    for (const bonus of bonuses) baseTrait.bonuses.push(bonus)
    for (const output1 of outputs) output = mergeMutationInput(output, output1)
  }

  return { ...output, baseTrait }
}

export function GCAInitialize_Mode(object: MutableObject, gca: GCAMode, modeIndex: number): MutationInput & { mode: RuntimeIGURPSMode } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  const { data: levelDefaultToTrait, ...output1 } = parseTraitDefaults(object, gca.skillUsed, `modes.${modeIndex}.defaults.list`)
  output = mergeMutationInput(output, output1)

  // 2. Build mode
  const mode: RuntimeIGURPSMode = {
    ...levelDefaultToTrait,
    //
    name: gca.name,
    level: {},
  }

  removeUndefinedKeys(mode)

  return { ...output, mode }
}

export function GCAInitialize_Modifier(object: MutableObject, gca: GCAModifier, traitOrModifier: IGURPSTraitOrModifier<`modifier`>): MutationInput & { modifier: RuntimeIGURPSModifier } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse some objects
  let levelNames: MaybeUndefined<string[]> = undefined
  if (!isNilOrEmpty(gca.levelNames)) levelNames = split(gca.levelNames)

  assert(!isNil(gca.level), `GCA modifier must have a "level" property`)

  let progression: MaybeUndefined<string> = undefined
  let expression: MaybeUndefined<string> = undefined

  expression = gca.formula
  if (!gca.forceFormula) progression = gca.cost

  let type: IGURPSModifier[`modifier`][`type`] = `integer`
  if (gca.cost) type = getProgressionType(gca.cost, false)

  // 2. Build BASE_TRAIT
  const modifier: RuntimeIGURPSModifier = {
    ...traitOrModifier,
    //
    shortName: gca.shortName,
    level: {
      names: levelNames,
      value: gca.level,
    },
    modifier: {
      display: null as any, // TODO: do this
      //
      progression,
      expression,
      type,
      round: gca.round === 1 ? `up` : gca.round === -1 ? `down` : `none`,
      //
    },
  }

  removeUndefinedKeys(modifier)

  return { ...output, modifier: modifier as RuntimeIGURPSModifier }
}

export function GCAInitialize_Bonus(object: MutableObject, key: string, gcaGives: string, dontApplyByDefault?: boolean): { outputs: MutationInput[]; bonuses: RuntimeIGURPSBonus<BooleanValue, NumericValue, StringValue>[] } {
  const { options, environment } = setupProcessing(object)

  // gcaGives = `+1 to AD:Damage Resistance From Me::points ByMode damtype contains "cut, pen" Unless Target::Tag = Z When "Circumstance"`
  // gcaGives = `+1 to AD:Damage Resistance From Me::points ByMode damtype contains "cut, pen" When "Circumstance"`
  // gcaGives = `=$if(me::level >= ST:DX THEN nobase) to ST:Punch::reach$, =$if(me::level >= ST:DX THEN nobase) to ST:Kick::reach$,=-ST:Encumbrance Penalty::score to me::skillscore, =+( @int(($modetag(charskillscore) + ST:Encumbrance Penalty::score)/2) - @int($modetag(charskillscore)/2) - ST:Encumbrance Penalty::score ) to me::parryscore$`
  // gcaGives = `+1 to ("CO:~Elemental Meta-Spells", "CO:~Elemental Air", "CO:~Elemental Earth", "CO:~Elemental Fire", "CO:~Elemental Metal", "CO:~Elemental Void/Sound/Ether", "CO:~Elemental Water", "CO:~Elemental Wood")`

  // 1. Break Gives() notation into { BONUS + TARGETS + EXCEPTIONS + INFO }[]
  const processedNotation = Strategy.process(object, key, {
    ...options,
    expression: gcaGives,
    environment,
    //
    reProcessingFunction: `compute:re-processing`,
    syntacticalContext: { mode: `GCABonus-list` },
    //
    skipListen: true,
    parseOnly: true,
  })

  const AST = processedNotation.state.AST as Nullable<ExpressionStatement>
  assert(AST?.type === `ExpressionStatement`, `AST must be an ExpressionStatement`)
  const expressionList = AST.expression as ExpressionList
  assert(expressionList.type === `ExpressionList`, `ExpressionList must be an ExpressionList`)

  // 2. Allocate bonus components from AST to re-processing
  const inputs: Arguments<(typeof Strategy)[`bulkProcess`]>[1] = []
  const bonuses: RuntimeIGURPSBonus<BooleanValue, NumericValue, StringValue>[] = []

  for (const [bonusIndex, gcaBonusExpression] of expressionList.expressions.entries()) {
    assert(GCABonusExpression.isGCABonusExpression(gcaBonusExpression), `Expression must be a GCABonusExpression`)

    // 1. Build target
    const targets: IGURPSBonus[`targets`] = []
    const targetExpressions = ExpressionList.isExpressionList(gcaBonusExpression.target) ? gcaBonusExpression.target.expressions : [gcaBonusExpression.target]
    for (const expression of targetExpressions) {
      let content = expression.getContent()
      // TODO: maybe just fix the parsing to only allow identifiers and members for this portion?

      const target: IGURPSBonus[`targets`][0] = { trait: content, tag: `default` }

      //   textConcatenation?: boolean // indicates if bonus should be concatenated as a string to current value (instead of adding numeric values)
      if (content.endsWith(`$`)) {
        target.textConcatenation = true
        content = content.slice(0, -1)
      }

      let [trait, tag] = content.split(`::`)

      target.trait = trait
      if (tag) target.tag = tag

      targets.push(target)
    }

    let byMode: IGURPSBonus[`byMode`] = undefined
    if (gcaBonusExpression.byMode) {
      assert(gcaBonusExpression.byMode.type === `StringLiteral`, `byMode must be a StringLiteral`)
      const byModeNotation = gcaBonusExpression.byMode.getContent()

      const traitSelector = Trait.parseSelectorNotation(byModeNotation)

      byMode = {
        tag: traitSelector.left,
        comparison: traitSelector.selector,
        value: traitSelector.right,
      }

      if (traitSelector.subcriteria) byMode.subCriteria = traitSelector.subcriteria
    }

    // 2. Build bonus
    const source: IGURPSBonus[`source`] = { trait: `me`, tag: `default` }
    if (gcaBonusExpression.source) {
      if (gcaBonusExpression.source.type === `MemberExpression`) {
        source.trait = (gcaBonusExpression.source as MemberExpression).object.getContent()
        source.tag = (gcaBonusExpression.source as MemberExpression).property.getContent()
      } else {
        source.trait = gcaBonusExpression.source.getContent()
      }
    }

    // 3. Get sub-expressions
    const bonusNotation = gcaBonusExpression.getContent()

    const bonusValue = gcaBonusExpression.value.getContent()
    const bonusMaximum = gcaBonusExpression.maximum ? gcaBonusExpression.maximum.getContent() : undefined
    const unless = gcaBonusExpression.exceptions?.unless ? gcaBonusExpression.exceptions.unless.getContent() : undefined
    const onlyIf = gcaBonusExpression.exceptions?.onlyIf ? gcaBonusExpression.exceptions.onlyIf.getContent() : undefined
    const _reason = gcaBonusExpression.information?.reason ? gcaBonusExpression.information.reason.getContent() : undefined
    const reason = _reason ? `"${_reason.startsWith(`"`) ? _reason.slice(1, -1) : _reason}"` : undefined

    const bonus: RuntimeIGURPSBonus<BooleanValue, NumericValue, StringValue> = {
      _notation: bonusNotation,
      //
      singleBonus: gcaBonusExpression.singleBonus ?? false,
      bonus: { expression: bonusValue },
      // maximum?: number // upto, MATH_ENABLED()
      //
      source,
      //
      dontApplyByDefault, // if Conditional() then TRUE
      //
      targets,
      byMode,
      //
      //
      // unless, // to be evaluated,
      // onlyIf, // to be evaluated,
      //
      //
      description: gcaBonusExpression.information?.description?.getContent() ?? undefined,
      // reason?: string // SPECIAL_CASE_SUBSTITUTION()
    }

    if (bonusMaximum) bonus.maximum = { expression: bonusMaximum }
    if (unless) bonus.unless = { expression: unless }
    if (onlyIf) bonus.onlyIf = { expression: onlyIf }
    if (reason) bonus.reason = { expression: reason }

    removeUndefinedKeys(bonus)

    if (bonus.source.trait !== `me`) debugger // TODO: Implement this

    // 4. Task processing for required shit
    const { options, environment } = setupProcessing(object)

    const keys: { key: string; expression: string | undefined }[] = [{ key: `bonus.value`, expression: bonusValue }]
    if (bonusMaximum) keys.push({ key: `maximum.value`, expression: bonusMaximum })
    // if (unless) keys.push({ key: `unless`, expression: unless })
    // if (onlyIf) keys.push({ key: `onlyIf`, expression: onlyIf })
    if (reason) keys.push({ key: `reason.value`, expression: reason })

    for (const { key, expression } of keys) {
      if (expression === undefined) continue

      inputs.push({
        path: `bonuses.[${bonusIndex}].${key}`,
        expression,
        environment,
        reProcessingFunction: `compute:re-processing`,
        syntacticalContext: { mode: `expression` },
      })
    }

    bonuses.push(bonus)
  }

  const processorFactory: StrategyProcessorParseOptions[`processorFactory`] = localOptions => {
    const processor = options.processorFactory!(localOptions)

    processor.syntacticalGrammar.add(createTransformNodeEntry(`target`, `StringLiteral`, EQUALS(`target`, true), `Identifier`))

    return processor
  }

  const processingOutputs = Strategy.bulkProcess(object, inputs, { ...options, processorFactory, syntacticalContext: { mode: `expression` } })
  // for (const [index, output] of processingOutputs.entries()) outputs.push({ bonus: bonuses[index], ...output })

  return { outputs: processingOutputs, bonuses }
}

//

//** just pre-re-parses the expression in defaults lists */
export function parseTraitDefaults(object: MutableObject, gcaListOfNotations: Nilable<string>, defaultsPath: string): MutationInput & { data: RuntimeIGURPSTraitDefaults } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Parse string into notation list
  let defaults: RuntimeIGURPSTraitDefaults[`defaults`] = null
  if (!isNilOrEmpty(gcaListOfNotations)) defaults = { list: split(gcaListOfNotations).map(notation => ({ expression: notation })) }

  const data: RuntimeIGURPSTraitDefaults = { defaults }

  // 2. Determine what to process
  const { options, environment } = setupProcessing(object)

  const inputs: Arguments<(typeof Strategy)[`bulkProcess`]>[1] = []

  // if (object.id === `12899`) debugger // SK:Karate

  if (data.defaults)
    for (const [i, defaultNotation] of data.defaults.list.entries()) {
      assert(!isNilOrEmpty(defaultNotation.expression), `Default notation must be a string`)
      inputs.push({
        path: `${defaultsPath}.${i}.value`, //`defaults.list.${i}.value`,
        expression: defaultNotation.expression,
        environment,
        reProcessingFunction: { name: `compute:re-processing`, hashableArguments: { defaultsIndex: i } },
      })
    }

  // 2. Pre-process stuff (for dependency graphs mostly)
  if (inputs.length > 0) {
    const processingOutputs = Strategy.bulkProcess(object, inputs, {
      ...options,
      //
      syntacticalContext: { mode: `expression` },
    })

    for (const processingOutput of processingOutputs) output = mergeMutationInput(output, processingOutput)
  }

  return { ...output, data }
}

function identifyTrait(node: Expression): string[] {
  let variableNames: string[] = []

  if (node.type === `NumericLiteral` || node.type === `StringLiteral` || node.type === `BooleanLiteral`) {
    // pass
  } else if (node.type === `Identifier`) {
    const identifier = node as Identifier
    const variableName = identifier.getContent()
    if (isAlias(variableName)) variableNames.push(variableName)
  } else if (node.type === `BinaryExpression`) {
    const binary = node as BinaryExpression
    variableNames.push(...identifyTrait(binary.left))
    variableNames.push(...identifyTrait(binary.right))
  }
  //
  else throw new Error(`Node type "${node.type}" is unexpected`)

  return variableNames
}

function computeDefaults(object: MutableObject, defaultsPath: string): MutationInput & { data: Omit<IGURPSTraitExpression, `value` | `expression`> } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  const defaults = (object as any).getProperty(defaultsPath)
  // if (object.id === `12899`) debugger // SK:Karate

  // 1. Get processed state
  // const state = get(object.metadata, `defaults.list.${defaultsIndex}.value`)
  const state = get(object.metadata, `${defaultsPath}.value`)
  assert(state, `State must be defined`)

  // 2. Get relevant trait (attribute or skill)
  const root = state.AST.children[0] as Expression
  const variableNames = uniq(identifyTrait(root))

  assert(variableNames.length === 1, `Exactly one variable name must be found`)

  // 3. Check if trait is KNOWN (i.e. attribute or known skill)
  const alias = variableNames[0]
  const aliasReference = aliasToReference(alias)
  const traits = alias === undefined ? [] : (object.controller.store.getByReference(aliasReference, false) as MutableObject<RuntimeIGURPSTrait>[])
  assert(traits.length <= 1, `Exactly one trait must be found by alias`)

  const trait = traits[0] as MaybeUndefined<MutableObject<RuntimeIGURPSTrait>>
  const type = trait ? trait.getProperty(`type`) : `∄`

  let isKnown: boolean
  if (type === `∄`) isKnown = false
  else if (type === `attribute`) isKnown = true
  else if (type === `skill` || type === `technique` || type === `spell`) {
    const basePoints = (trait as MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique>).getProperty(`points.base`)
    isKnown = basePoints > 0
  }

  if (type === `technique`) debugger

  assert(!isNil(isKnown!), `isKnown must be defined`)

  // 4. Push mutations
  output.mutations.push(OVERRIDE(`${defaultsPath}.trait`, alias))
  output.mutations.push(OVERRIDE(`${defaultsPath}.isKnown`, isKnown))

  return {
    ...output,
    data: {
      trait: alias,
      isKnown,
    },
  }
}

export function GCAComputeDefaults(object: MutableObject<RuntimeIGURPSTraitDefaults>, defaultsIndex: number): MutationInput & { data: Omit<IGURPSTraitExpression, `value` | `expression`> } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  // 1. Get defaults entry
  const defaults = object.getProperty(`defaults`)
  assert(defaults, `Defaults must be defined`)

  const defaultNotation = defaults.list[defaultsIndex]
  assert(defaultNotation, `Default notation must be defined`)

  // 2. Compute default trait notation
  const { data, ...output1 } = computeDefaults(object, `defaults.list.${defaultsIndex}`)
  output = mergeMutationInput(output, output1)

  return {
    ...output,
    data,
  }
}

export function GCAComputeModeDefaults(
  object: MutableObject<RuntimeIGURPSBaseTrait, GURPSCharacter>,
  modeIndex: number,
  defaultIndex: number,
): MutationInput & { data: Omit<IGURPSTraitExpression, `value` | `expression`>; bestDefaultIndex: Nullable<number> } {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  assert(!isNil(modeIndex) && isNumber(modeIndex) && !isNaN(modeIndex), `Mode index must be defined`)
  assert(!isNil(defaultIndex) && isNumber(defaultIndex) && !isNaN(defaultIndex), `Skill index must be defined`)

  // 1. Get default trait notation
  const mode = object.getProperty(`modes`)[modeIndex]
  assert(mode, `Mode must be defined`)

  const defaultNotation = mode.defaults?.list[defaultIndex]
  assert(defaultNotation, `Default notation must be defined`)

  // 2. Compute default trait notation
  const { data, ...output1 } = computeDefaults(object, `modes.${modeIndex}.defaults.list.${defaultIndex}`)
  output = mergeMutationInput(output, output1)

  // 3. Compute best default
  let bestDefaultIndex: Nilable<number> = (object.getProperty(`modes.${modeIndex}.defaults.best`) as number) ?? null

  // 3.A. If there is no CURRENT DEFAULT (aka BEST DEFAULT), set this as default (only if processing is ready)
  if (isNil(bestDefaultIndex)) bestDefaultIndex = defaultIndex
  // 3.B. If there is a currently best default, check it against this to choose bestest overall
  else {
    const bestDefaultNotation = object.getProperty(`modes.${modeIndex}.defaults.list.${defaultIndex}`) as MaybeUndefined<NonNil<RuntimeIGURPSBaseTrait[`modes`][0][`defaults`]>[`list`][0]>
    assert(bestDefaultNotation, `Current default must be defined`)

    const bestValue = bestDefaultNotation.value?.asNumber()
    assert(bestValue !== undefined, `Value must be defined`)

    const thisValue = defaultNotation.value?.asNumber()
    assert(thisValue !== undefined, `Value must be defined`)

    if (thisValue > bestValue) bestDefaultIndex = defaultIndex
  }

  if (!isNil(bestDefaultIndex)) output.mutations.push(OVERRIDE(`modes.${modeIndex}.defaults.best`, bestDefaultIndex))

  debugger

  return { ...output, data, bestDefaultIndex }
}

//

export function GURPSTaskComputeBonus(object: MutableObject<RuntimeIGURPSBaseTrait>, bonusIndex: number, targetIndex: number, eventDispatcher: EventDispatcher<Event>) {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  assert(!isNil(bonusIndex) && isNumber(bonusIndex) && !isNaN(bonusIndex), `Bonus index must be defined`)
  assert(!isNil(targetIndex) && isNumber(targetIndex) && !isNaN(targetIndex), `Target index must be defined`)

  const path = `bonuses.${bonusIndex}.targets.${targetIndex}`

  assert(eventDispatcher.type === `property:updated`, `Event must be property:updated`)
  const previousTarget = get(object.previousData, path) as MaybeUndefined<RuntimeIGURPSBaseTrait[`bonuses`][0][`targets`][0]>

  const bonus = object.getProperty(`bonuses`)[bonusIndex]
  const currentTarget = bonus.targets[targetIndex]

  // 1. Compare current targets vs previous, and remove given bonuses for "missing" targets
  const targetChanged = previousTarget !== undefined && (previousTarget.trait !== currentTarget.trait || previousTarget.tag !== currentTarget.tag)
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
}

export function GURPSComputeBonus(target: MutableObject<RuntimeIGURPSBaseTrait>, originID: string, bonusIndex: number, targetIndex: number) {
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
}

export function GURPSComputeLevelBonus(object: MutableObject<RuntimeIGURPSBaseTrait & IGURPSLevelBasedTraitOrModifier>) {
  let output: MutationInput = { mutations: [], integrityEntries: [], dependencies: [] }

  const bonuses = object.getProperty(`level.bonuses`)
  assert(bonuses, `Bonuses must be defined`)

  let bonusLevel = 0
  for (const [key, value] of Object.entries(bonuses)) bonusLevel += value

  output.mutations.push(OVERRIDE(`level.bonus`, bonusLevel))

  return output
}
