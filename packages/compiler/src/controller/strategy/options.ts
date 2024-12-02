import assert from "assert"
import { AnyObject } from "tsdef"
import { get, isNil, isNumber, set } from "lodash"

import { Simbol, SymbolTable } from "@december/tree"
import { Strategy, Mutation, SET, MutableObject } from "@december/compiler"

import { Generator, ProcessingSymbolTranslationTable } from "@december/compiler/controller/strategy"
import type { StrategyProcessingPackage, StrategyProcessListenOptions, StrategyProcessSymbolOptions } from "@december/compiler/controller/strategy"
import { IntegrityEntry } from "@december/compiler/controller/integrityRegistry"
import { REFERENCE_ADDED } from "@december/compiler/controller/eventEmitter/event"

import { PLACEHOLDER_SELF_REFERENCE, PROPERTY, PropertyReference, REFERENCE, Reference, SELF_PROPERTY } from "@december/utils/access"

import { defaultUnitManager } from "@december/system"
import { IGURPSCharacter, IGURPSTrait, Trait } from "@december/gurps"
import { isNameExtensionValid, Type, IGURPSTraitMode, isAlias, getAliases } from "@december/gurps/trait"
import { DamageTable } from "@december/gurps/character"

import { GCACharacter, GCATrait } from "@december/gca"

import { StrategyProcessBuildOptions } from "@december/compiler/controller/strategy/processing"

export const GCAProcessingBuildOptions: Omit<StrategyProcessBuildOptions, `scope`> = {
  unitManager: defaultUnitManager(),
}

export const GCAProcessingListenOptions: Omit<StrategyProcessListenOptions, `reProcessingFunction`> = {
  canListenToSymbol: symbol => {
    const key = symbol.key
    return isAlias(key)
  },
  generatePropertyPatterns: (key: Simbol[`key`], symbols: Simbol[]) => {
    if (isAlias(key)) {
      return [SELF_PROPERTY(`_`)]
    }

    throw new Error(`Get property patterns from symbol "${key}" not implemented`)
  },
}

export const GCAProcessingSymbolOptionsGenerator: Generator<StrategyProcessSymbolOptions & Omit<StrategyProcessListenOptions, `reProcessingFunction`>> = (object: MutableObject) => ({
  ...GCAProcessingListenOptions,
  //
  fetchReference: (key, symbols, symbolKey) => {
    if (isAlias(key)) {
      const [referencedObject] = object.controller.store.getByReference(new Reference(`alias`, key), false)
      if (referencedObject) {
        // TODO: Do for shit other than level
        return referencedObject._getData(referencedObject.data.level, `level`)
      }
    }

    throw new Error(`Fetch for reference "${key}/${symbolKey}" not implemented`)
  },
})
