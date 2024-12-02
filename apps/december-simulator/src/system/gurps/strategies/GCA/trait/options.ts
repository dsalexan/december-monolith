import assert from "assert"
import { AnyObject } from "tsdef"
import { get, isNil, isNumber, set } from "lodash"

import { Simbol, SymbolTable } from "@december/tree"
import { Strategy, Mutation, SET, MutableObject } from "@december/compiler"

import { Generator, ProcessingSymbolTranslationTable } from "@december/compiler/controller/strategy"
import type { StrategyProcessingPackage, StrategyProcessListenOptions, StrategyProcessSymbolOptions } from "@december/compiler/controller/strategy"
import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { REFERENCE_ADDED } from "@december/compiler/controller/eventEmitter/event"

import { ANY_PROPERTY, PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"

import { IGURPSCharacter, IGURPSTrait, Trait } from "@december/gurps"
import { isNameExtensionValid, Type, IGURPSTraitMode, isAlias, getAliases } from "@december/gurps/trait"
import { DamageTable } from "@december/gurps/character"

import { GCACharacter, GCATrait, isPropertyInvoker } from "@december/gca"

import { StrategyProcessBuildOptions } from "@december/compiler/controller/strategy/processing"

import { unitManager } from "../../../../../unit"

export const GCAProcessingBuildOptions: Omit<StrategyProcessBuildOptions, `scope`> = {
  unitManager,
}

export const GCAProcessingListenOptions: Omit<StrategyProcessListenOptions, `reProcessingFunction`> = {
  canListenToSymbol: symbol => {
    const key = symbol.key

    if (isAlias(key)) return true

    const property = isPropertyInvoker(key)
    if (property && isAlias(property.target)) return true

    return false
  },
  generatePropertyPatterns: (key: Simbol[`key`], symbols: Simbol[]) => {
    const property = isPropertyInvoker(key)

    if (isAlias(key) || (property && isAlias(property.target))) {
      const alias = isAlias(key) ? key : (property as any).target
      return [PROPERTY(REFERENCE(`alias`, alias), ANY_PROPERTY)]
    }

    throw new Error(`Get property patterns from symbol "${key}" not implemented`)
  },
}

export const GCAProcessingSymbolOptionsGenerator: Generator<StrategyProcessSymbolOptions & Omit<StrategyProcessListenOptions, `reProcessingFunction`>> = (object: MutableObject) => ({
  ...GCAProcessingListenOptions,
  //
  fetchReference: (key, symbols, symbolKey) => {
    /**
     * valueIvoker -> returns value for symbol
     *    null -> symbol reference not found
     *    undefined -> fetch scenario not implemented
     *    value -> symbol reference found
     */

    const propertyInvoker = isPropertyInvoker(key)

    if (isAlias(key) || (propertyInvoker && isAlias(propertyInvoker.target))) {
      const alias = isAlias(key) ? key : (propertyInvoker as any).target

      const [referencedObject] = object.controller.store.getByReference(new Reference(`alias`, alias), false)
      if (referencedObject) {
        const property = propertyInvoker ? propertyInvoker.property : `level`

        // TODO: Do for shit other than level
        if (property !== `level`) debugger

        return referencedObject._getData(referencedObject.data.level, property)
      }
    }

    return null
    // throw new Error(`Fetch for reference "${key}/${symbolKey}" not implemented`)
  },
})
