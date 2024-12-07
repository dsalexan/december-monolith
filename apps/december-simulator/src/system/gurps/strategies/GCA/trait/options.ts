import assert from "assert"
import { AnyObject } from "tsdef"
import { get, isNil, isNumber, set } from "lodash"

import { Simbol, SymbolTable } from "@december/tree"
import { UndefinedValue, NullValue } from "@december/tree/environment"
import { Strategy, Mutation, SET, MutableObject } from "@december/compiler"

import type { ReProcessingOptionsGenerator, StrategyProcessingPackage, StrategyProcessListenOptions, StrategyProcessSymbolOptions } from "@december/compiler/controller/strategy"
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
  canListenToSymbol: symbolKey => {
    if (isAlias(symbolKey)) return true

    const property = isPropertyInvoker(symbolKey)
    if (property && isAlias(property.target)) return true

    return false
  },
  generatePropertyPatterns: symbolKey => {
    const property = isPropertyInvoker(symbolKey)

    if (isAlias(symbolKey) || (property && isAlias(property.target))) {
      const alias = isAlias(symbolKey) ? symbolKey : (property as any).target
      return [PROPERTY(REFERENCE(`alias`, alias), ANY_PROPERTY)]
    }

    throw new Error(`Get property patterns from symbol "${symbolKey}" not implemented`)
  },
}

export const GCAProcessingSymbolOptionsGenerator: ReProcessingOptionsGenerator = (object: MutableObject) => ({
  ...GCAProcessingListenOptions,
  //
  getSymbolValue: symbolKey => {
    /**
     * SYMBOL VALUE INVOKER -> returns value for symbol
     *    value -> symbol reference found (be it a "real" value or UndefinedValue or NullValue)
     *    undefined -> symbol reference not found
     */

    const propertyInvoker = isPropertyInvoker(symbolKey)

    if (isAlias(symbolKey) || (propertyInvoker && isAlias(propertyInvoker.target))) {
      const alias = isAlias(symbolKey) ? symbolKey : (propertyInvoker as any).target

      const [referencedObject] = object.controller.store.getByReference(new Reference(`alias`, alias), false)
      if (referencedObject) {
        const property = propertyInvoker ? propertyInvoker.property : `level`

        // TODO: Do for shit other than level
        if (property !== `level`) debugger

        return referencedObject._getData(referencedObject.data.level, property)
      }
    }

    return undefined
  },
})
