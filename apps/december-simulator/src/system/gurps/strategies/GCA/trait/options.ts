import { ObjectID } from "@december/compiler/object"
import assert from "assert"
import { AnyObject, MaybeArray, Nullable } from "tsdef"
import { get, isArray, isNil, isNumber, isString, set, uniq } from "lodash"

import { ElementPattern, EQUALS, FUNCTION, REGEX } from "@december/utils/match/element"

import { DICE_MODULAR_EVALUATOR_PROVIDER, DICE_MODULAR_SYNTACTICAL_GRAMMAR, DICE_MODULAR_REWRITER_RULESET } from "@december/system/dice"
import { makeDefaultProcessor } from "@december/tree/processor"
import { Environment, ObjectValue, RuntimeValue, VariableName } from "@december/tree/interpreter"
import { createTransformNodeEntry } from "@december/tree/parser"
import { Simbol } from "@december/tree/symbolTable"
import { createEntry, KEYWORD_PRIORITY } from "@december/tree/lexer/grammar"
import { makeConstantLiteral, makeToken } from "@december/tree/utils/factories"
import { Identifier, MemberExpression, Node, StringLiteral } from "@december/tree/tree"
import { createRecontextualizationEntry, RecontextualizationEntry } from "@december/tree/parser/grammar/entries"

import { Strategy, Mutation, SET, MutableObject } from "@december/compiler"

import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { REFERENCE_ADDED } from "@december/compiler/controller/eventEmitter/event"

import { ANY_PROPERTY, PLACEHOLDER_SELF_REFERENCE, Property, PROPERTY, PropertyReference, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"

import { IGURPSCharacter, IGURPSTrait, Trait } from "@december/gurps"
import { isNameExtensionValid, Type, isAlias, getAliases, IGURPSAttribute, makeGURPSTraitEnvironment, IGURPSTraitOrModifier } from "@december/gurps/trait"
import { DamageTable } from "@december/gurps/character"
import { TraitType } from "@december/gurps/trait/type"

import { GCACharacter, GCATrait } from "@december/gca"
import { MATH_FUNCTIONS_INDEX, ValueType } from "@december/gca/trait/mathFunctions"

import { unitManager } from "../../../../../unit"

// TODO: uhu
import { StrategyProcessorListenOptions, StrategyProcessorParseOptions, StrategyProcessorResolveOptions } from "@december/compiler/controller/strategy/processor"
import { RuntimeIGURPSAttribute, RuntimeIGURPSEquipment, RuntimeIGURPSGeneralTrait, RuntimeIGURPSModifier, RuntimeIGURPSSkillOrSpellOrTechnique, RuntimeIGURPSTrait } from "./parsers"
import GURPSCharacter from "../../../character"
import { SyntaxMode } from "../../../../../../../../packages/tree/src/parser/grammar/parserFunction"

export const GCAMathFunctionsRecontextualizations: RecontextualizationEntry[] = Object.entries(MATH_FUNCTIONS_INDEX).map(([functionName, definition]) => {
  assert(definition.type === `regular`, `Only regular functions are supported`)

  const getContextMode = (arg: ValueType): SyntaxMode => {
    if (arg === `expression` || arg === `tag-name` || arg === `numeric` || arg === `numeric-expression` || arg === `any`) return `expression`
    if (arg === `string`) return `text`

    throw new Error(`Unimplemented type "${arg}"`)
  }

  let reContextualizationFunction: RecontextualizationEntry[`reContextualization`]

  const uniqueArguments = uniq(definition.arguments)
  if (uniqueArguments.length === 1) {
    const [arg] = definition.arguments

    const mode = getContextMode(arg)
    reContextualizationFunction = (node, context) => ({ ...context, mode })
  } else {
    const modesByArgument: SyntaxMode[] = definition.arguments.map(getContextMode)
    reContextualizationFunction = (node, context) => modesByArgument.map(mode => ({ ...context, mode }))
  }

  return createRecontextualizationEntry(functionName, `CallExpression`, EQUALS(`${functionName}`, true), reContextualizationFunction!)
})

export const GCAStrategyProcessorParseOptions: (object: MutableObject) => Omit<StrategyProcessorParseOptions, `syntacticalContext`> = (object: MutableObject) => ({
  unitManager,
  processorFactory: options => {
    const processor = makeDefaultProcessor(options)

    processor.syntacticalGrammar.add(...DICE_MODULAR_SYNTACTICAL_GRAMMAR)
    processor.graphRewriteSystem.add(...DICE_MODULAR_REWRITER_RULESET)
    processor.nodeEvaluator.addDictionaries(DICE_MODULAR_EVALUATOR_PROVIDER, true)

    // GCA RESERVED WORDS
    processor.syntacticalGrammar.add(createTransformNodeEntry(`char`, `StringLiteral`, EQUALS(`char`), `Identifier`))
    processor.syntacticalGrammar.add(createTransformNodeEntry(`owner`, `StringLiteral`, EQUALS(`owner`), `Identifier`))
    processor.syntacticalGrammar.add(createTransformNodeEntry(`me`, `StringLiteral`, EQUALS(`me`), `Identifier`))
    processor.syntacticalGrammar.add(createTransformNodeEntry(`thr`, `StringLiteral`, EQUALS(`thr`), `Identifier`))
    processor.syntacticalGrammar.add(createTransformNodeEntry(`sw`, `StringLiteral`, EQUALS(`sw`), `Identifier`))
    processor.syntacticalGrammar.add(createTransformNodeEntry(`alias`, `StringLiteral`, FUNCTION(isAlias), `Identifier`))

    // #region GCA -> GURPS COMPAT LAYER
    //    A. Major Property Access (Level/Score/Points)
    processor.syntacticalGrammar.add(
      // EQUALS(`me->level`, true)
      createTransformNodeEntry(
        `get_value_from_object`,
        `MemberExpression`,
        FUNCTION((content: string, memberExpression: MemberExpression) => {
          const property = memberExpression.property.getContent().trim()

          // 1. Confirm property
          const apparentProperties = [`level`, `score`, `points`, `basevalue`, `basescore`]
          const shouldAccessValue = apparentProperties.includes(property)
          if (!shouldAccessValue) return false

          // 2. Check if it is a "leaf" member expression
          let isLeaf = false

          if (memberExpression.parent === null) isLeaf = true
          else debugger

          return isLeaf
        }),
        (memberExpression: MemberExpression) => {
          const property = memberExpression.property.getContent().trim()

          if (property === `basevalue`) return MemberExpression.makeChain(memberExpression.object, `score`, `base`, `initial`)
          else if (property === `basescore`) return MemberExpression.makeChain(memberExpression.object, `score`, `base`, `value`)

          return new MemberExpression(memberExpression, makeConstantLiteral(`value`))
        },
      ),
    )
    //    B. Generic Property Access
    const lookup = [
      [`char->enclevel`, `encumbranceLevel`],
      [`char->equipmentcost`, `equipmentCost`],
      [`char->currentload`, `currentLoad`],
      [`char->campaigntotalmoney`, [`campaign`, `totalMoney`]],
      [`char->weaponst`, [`modes`, new Identifier(makeToken(`modeIndex`)), `strength`, `minimum`]], // Special Case: Weapon Minimum ST
    ] as [string, MaybeArray<string | Node>][]
    for (const [from, _toChain] of lookup) {
      const toChain = isArray(_toChain) ? _toChain : [_toChain]

      processor.syntacticalGrammar.add(
        createTransformNodeEntry(
          from.replace(`->`, `_`), //
          `MemberExpression`,
          EQUALS(from, false),
          (memberExpression: MemberExpression) => MemberExpression.makeChain(memberExpression.object, ...toChain),
        ),
      )
    }
    // #endregion

    // SPECIAL CASE SUBSTITUTIONS
    processor.syntacticalGrammar.add(createTransformNodeEntry(`me_level`, `StringLiteral`, EQUALS(`%level`, true), `Identifier`))

    // MATH FUNCTIONS
    processor.syntacticalGrammar.add(...GCAMathFunctionsRecontextualizations)

    return processor
  },
})

const REMOVE_VALUE: unique symbol = Symbol.for(`gca:remove_value`)
type RemoveValue = typeof REMOVE_VALUE

export function getVariableNameAsRuntimeValue<TObject extends AnyObject = AnyObject>(character: GURPSCharacter, target: string): Nullable<ObjectValue<TObject>> {
  if (isAlias(target)) {
    const alias = target

    const [referencedObject] = character.store.getByReference(new Reference(`alias`, alias), false) as MutableObject<RuntimeIGURPSTrait>[]
    if (referencedObject) {
      const data = referencedObject.getData()
      const type = data.type

      let numberValue: Nullable<number> = null

      if (data.type === `attribute`) {
        const score = data.score.value
        if (!isNil(score)) numberValue = score
      } else if (data.type !== `equipment`) {
        const level = data.level.value
        if (!isNil(level)) numberValue = level
      }
      //
      else throw new Error(`Trait type "${type}" not implemented`)

      if (numberValue !== null) return new ObjectValue(data as any, { numberValue, booleanValue: numberValue > 0 })
      else return new ObjectValue(data as any)
    }
  }

  return null
}

export const GCAStrategyProcessorResolveOptionsGenerator: (object: MutableObject) => Omit<StrategyProcessorResolveOptions, `syntacticalContext`> = (object: MutableObject) => ({
  isValidFunctionName: (functionName: string) => functionName.startsWith(`@`),
  environmentUpdateCallback: (environment, symbolTable, locallyUpdatedVariables: VariableName[]) => {
    // (a map with unique variables and their first occuring symbol — mostly for reference, we don't care about linked nodes here)
    // (property symbols are mostly discarded too, we just care about their variableNames)
    const uniqueVariables: Map<VariableName, Simbol> = new Map()

    // 1. Index all indirect variables (a variable pointing to another variable)
    const rasterizedIndirectVariables = environment.rasterizeIndirectVariablesAsSymbols() // a runtime VARIABLE_VALUE is basically proxy a value to another value, so we speed things up by trying to link the value here before it is event found in symbol table
    for (const symbol of rasterizedIndirectVariables) if (!uniqueVariables.has(symbol.variableName)) uniqueVariables.set(symbol.variableName, symbol)

    // 2. Index all symbols invoked by the interpreter (i.e. SymbolTable) contextualized by the environment
    // TODO: This is for updating ALL previously assigned symbols, the ideal should be to only update the ones that were changed
    const tableSymbols = symbolTable.getAllVariables(environment) // we are ALWAYS looking to update any symbol present in table, making this reactive would be a pain
    for (const symbol of tableSymbols) if (!uniqueVariables.has(symbol.variableName)) uniqueVariables.set(symbol.variableName, symbol)

    // 3. Update only "new" variables (updated variables are registered inside locallyUpdatedVariables so we don't do it twice unecessarily)
    const variablesAsSymbols: Simbol[] = [...uniqueVariables.values()]
    const nonLocallyUpdatedVariablesAsSymbols = variablesAsSymbols.filter(symbol => !locallyUpdatedVariables.includes(symbol.variableName))

    for (const symbol of nonLocallyUpdatedVariablesAsSymbols) {
      const variableName = symbol.variableName

      // 1. Fetch RUNTIME_VALUE corresponding to VARIABLE NAME
      let runtimeValue: Nullable<RuntimeValue<any> | RemoveValue> = getVariableNameAsRuntimeValue(object.controller as GURPSCharacter, variableName)

      // (DEBUG: throw error for GCA functions, mostly while developing)
      const isGCAFunction = variableName.startsWith(`@`) || variableName.startsWith(`$`)
      if (runtimeValue === null && isGCAFunction) {
        const resolvedFunctionName = environment.resolve(variableName)
        const isPresent = !!resolvedFunctionName && !!resolvedFunctionName.environment

        assert(isPresent, `Unimplemented function "${variableName}"`)
      }

      // 2. Assign runtimeValue into environment
      if (runtimeValue !== null) {
        // TODO: What to do if a runtimeValue suddenly vanishes?
        if ((runtimeValue as any) === REMOVE_VALUE) {
          const currentlyHasValue = !!environment.resolve(variableName)?.environment
          debugger
        } else {
          const assigned = environment.assignValue(variableName, runtimeValue, true)
          if (assigned) locallyUpdatedVariables.push(variableName)
        }
      }
    }
  },
})

export const GCAStrategyProcessorOptionsGenerator: (object: MutableObject) => Omit<StrategyProcessorParseOptions & StrategyProcessorResolveOptions, `syntacticalContext`> = (object: MutableObject) => ({
  ...GCAStrategyProcessorParseOptions(object),
  ...GCAStrategyProcessorResolveOptionsGenerator(object),
})

export const GCAStrategyProcessorListenOptions: Omit<StrategyProcessorListenOptions, `reProcessingFunction`> = {
  isSymbolListenable: symbol => {
    if (isAlias(symbol.variableName)) return true

    // (here because BaseTHDice is based on char->damageTable) (see below)
    if (symbol.variableName === `@basethdice`) return true

    return false
  },
  generatePropertyPatterns: symbol => {
    if (isAlias(symbol.variableName)) {
      const alias = symbol.variableName

      // default property is "level" or "score", depending on the type
      let property: ElementPattern<string> | Property

      if (symbol.value.type !== `name`) property = symbol.value.properties.join(`.`)
      else {
        if (alias.startsWith(`ST:`) || [`ST`, `DX`, `IQ`, `HT`, `Will`, `Per`]) property = `score.value`
        else property = `level.value`
      }

      assert(property!, `Property msut be defined`) //

      return [PROPERTY(REFERENCE(`alias`, alias), property)]
    }

    if (symbol.variableName === `@basethdice`) return [PROPERTY(REFERENCE(`id`, `general`), `damageTable`)]

    throw new Error(`Get property patterns from symbol "${symbol.variableName}" not implemented`)
  },
  getDependencyEntry: (id: ObjectID, symbol) => {
    // TODO: Dependency entries should go down to nested properties
    if (isAlias(symbol.variableName)) return [{ id, objects: [new Reference(`alias`, symbol.variableName)] }]

    return null
  },
}

export const DEFAULT_PROPERTY: unique symbol = Symbol.for(`gca:default_property`)
export type DefaultProperty = typeof DEFAULT_PROPERTY

export function isTrait(type: `attribute`, object: MutableObject<RuntimeIGURPSTrait>): object is MutableObject<RuntimeIGURPSAttribute>
export function isTrait(type: `equipment`, object: MutableObject<RuntimeIGURPSTrait>): object is MutableObject<RuntimeIGURPSEquipment>
export function isTrait(type: `general-trait`, object: MutableObject<RuntimeIGURPSTrait>): object is MutableObject<RuntimeIGURPSGeneralTrait>
export function isTrait(type: `skill-related`, object: MutableObject<RuntimeIGURPSTrait>): object is MutableObject<RuntimeIGURPSSkillOrSpellOrTechnique>
export function isTrait(type: `level-based`, object: MutableObject<RuntimeIGURPSTrait>): object is MutableObject<RuntimeIGURPSGeneralTrait | RuntimeIGURPSSkillOrSpellOrTechnique>
export function isTrait(type: TraitType | `general-trait` | `skill-related` | `level-based`, object: MutableObject<RuntimeIGURPSTrait>): object is MutableObject<RuntimeIGURPSTrait> {
  const objectType = object.getProperty(`type`)

  assert((objectType as any) !== `modifier`, `Modifier is not a trait`)

  if (type === `general-trait`) return objectType !== `equipment` && objectType !== `attribute` && objectType !== `skill` && objectType !== `spell` && objectType !== `technique`
  if (type === `level-based`) return isTrait(`skill-related`, object) || isTrait(`general-trait`, object)

  return objectType === type
}

export function setupProcessing<TObject extends AnyObject = IGURPSTraitOrModifier>(
  object: MutableObject<TObject>,
): {
  options: Omit<StrategyProcessorListenOptions, `reProcessingFunction`> & Omit<StrategyProcessorParseOptions & StrategyProcessorResolveOptions, `syntacticalContext`>
  environment: Environment
  trait: TObject
} {
  const options = { ...GCAStrategyProcessorListenOptions, ...GCAStrategyProcessorOptionsGenerator(object) }

  const controller = object.controller as GURPSCharacter
  const characterObject = controller.data
  assert(characterObject, `Character not found`)
  const character = characterObject.getData()

  const trait = object.getData()
  assert(trait, `Trait not found`)

  const baseEnvironment = new Environment(`gurps:local`, makeGURPSTraitEnvironment(character, trait))

  return { options, environment: baseEnvironment, trait }
}
