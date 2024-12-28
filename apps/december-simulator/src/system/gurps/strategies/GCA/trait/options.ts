import assert from "assert"
import { AnyObject, Nullable } from "tsdef"
import { get, isNil, isNumber, set } from "lodash"

import { EQUALS, FUNCTION, REGEX } from "@december/utils/match/element"

import { DICE_MODULAR_EVALUATOR_PROVIDER, DICE_MODULAR_SYNTACTICAL_GRAMMAR, DICE_MODULAR_REWRITER_RULESET } from "@december/system/dice"
import { makeDefaultProcessor } from "@december/tree/processor"
import { ObjectValue, RuntimeValue } from "@december/tree/interpreter"
import { createReTyperEntry } from "@december/tree/parser"
import { Simbol } from "@december/tree/symbolTable"

import { Strategy, Mutation, SET, MutableObject } from "@december/compiler"

import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { REFERENCE_ADDED } from "@december/compiler/controller/eventEmitter/event"

import { ANY_PROPERTY, PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"

import { IGURPSCharacter, IGURPSTrait, Trait } from "@december/gurps"
import { isNameExtensionValid, Type, IGURPSTraitMode, isAlias, getAliases } from "@december/gurps/trait"
import { DamageTable } from "@december/gurps/character"

import { GCACharacter, GCATrait } from "@december/gca"

import { unitManager } from "../../../../../unit"

// TODO: uhu
import { StrategyProcessorListenOptions, StrategyProcessorParseOptions, StrategyProcessorResolveOptions } from "@december/compiler/controller/strategy/processor"

export const GCAStrategyProcessorParseOptions: Omit<StrategyProcessorParseOptions, `syntacticalContext`> = {
  unitManager,
  processorFactory: options => {
    const processor = makeDefaultProcessor(options)

    processor.syntacticalGrammar.add(...DICE_MODULAR_SYNTACTICAL_GRAMMAR)
    processor.graphRewriteSystem.add(...DICE_MODULAR_REWRITER_RULESET)
    processor.nodeEvaluator.addDictionaries(DICE_MODULAR_EVALUATOR_PROVIDER, true)

    processor.syntacticalGrammar.add(createReTyperEntry(`me`, `Identifier`, EQUALS(`me`)))
    processor.syntacticalGrammar.add(createReTyperEntry(`thr`, `Identifier`, EQUALS(`thr`)))
    processor.syntacticalGrammar.add(createReTyperEntry(`sw`, `Identifier`, EQUALS(`sw`)))
    processor.syntacticalGrammar.add(createReTyperEntry(`alias`, `Identifier`, FUNCTION(isAlias)))

    return processor
  },
}

const REMOVE_VALUE: unique symbol = Symbol.for(`gca:remove_value`)
type RemoveValue = typeof REMOVE_VALUE

export const GCAStrategyProcessorResolveOptionsGenerator: (object: MutableObject) => Omit<StrategyProcessorResolveOptions, `syntacticalContext`> = (object: MutableObject) => ({
  isValidFunctionName: (functionName: string) => functionName.startsWith(`@`),
  environmentUpdateCallback: (environment, symbolTable) => {
    const symbols: Map<Simbol[`name`], Simbol> = new Map()

    const variableReassignmentSymbols = environment.getVariableReassignmentAsSymbols() // a runtime VARIABLE_VALUE is basically proxy a value to another value, so we speed things up by trying to link the value here before it is event found in symbol table
    for (const symbol of variableReassignmentSymbols) if (!symbols.has(symbol.name)) symbols.set(symbol.name, symbol)

    const tableSymbols = symbolTable.getAllSymbols(environment) // we are ALWAYS looking to update any symbol present in table, making this reactive would be a pain
    for (const symbol of tableSymbols) if (!symbols.has(symbol.name)) symbols.set(symbol.name, symbol)

    const allSymbols: Simbol[] = [...symbols.values()]

    for (const symbol of allSymbols) {
      let value: Nullable<RuntimeValue<any> | RemoveValue> = null

      // ===========================================================================================================================

      const target = symbol.name

      if (isAlias(target)) {
        const alias = target

        const [referencedObject] = object.controller.store.getByReference(new Reference(`alias`, alias), false) as MutableObject<IGURPSTrait>[]
        if (referencedObject) {
          const type = referencedObject.getProperty(`type`) as Type.TraitType
          const effectiveProperty = type === `attribute` ? `score` : `level`

          const numberValue = referencedObject.getProperty(effectiveProperty) as number
          value = new ObjectValue(referencedObject, { numberValue })
        }
      }

      // ===========================================================================================================================
      // ?. Assign value into environment
      if (value !== null) {
        //  What to do if a value suddenly vanishes?
        if ((value as any) === REMOVE_VALUE) {
          const currentlyHasValue = !!environment.resolve(symbol.name)?.environment
          debugger
        } else {
          environment.assignValue(symbol.name, value, true)
        }
      }
    }
  },
})

export const GCAStrategyProcessorOptionsGenerator: (object: MutableObject) => Omit<StrategyProcessorParseOptions & StrategyProcessorResolveOptions, `syntacticalContext`> = (object: MutableObject) => ({
  ...GCAStrategyProcessorParseOptions,
  ...GCAStrategyProcessorResolveOptionsGenerator(object),
})

export const GCAStrategyProcessorListenOptions: Omit<StrategyProcessorListenOptions, `reProcessingFunction`> = {
  isSymbolListenable: symbol => {
    if (isAlias(symbol.name)) return true

    if (symbol.name === `@basethdice`) return true

    return false
  },
  generatePropertyPatterns: symbol => {
    if (isAlias(symbol.name)) {
      const alias = symbol.name
      return [PROPERTY(REFERENCE(`alias`, alias), ANY_PROPERTY)]
    }

    if (symbol.name === `@basethdice`) return [PROPERTY(REFERENCE(`id`, `general`), `damageTable`)]

    throw new Error(`Get property patterns from symbol "${symbol.name}" not implemented`)
  },
}

export const DEFAULT_PROPERTY: unique symbol = Symbol.for(`gca:default_property`)
export type DefaultProperty = typeof DEFAULT_PROPERTY
