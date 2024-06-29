import { cloneDeep, isArray, isNil, mergeWith, set, last, has, isEqual, get, isEmpty, isString, intersection } from "lodash"

import { typing } from "@december/utils"

import { Instruction, InstructionConflictResolution, prepareConflictResolution, resolveConflict } from "./instruction"
import type { InferData } from "./object"
import CompilableObject from "./object"

export const ACTIONS = [`ignore`, `same`, `pass`, `conflict`, `set`, `push`, `merge`] as const

export type Action = (typeof ACTIONS)[number]

// Recipe is a compilation of instructions resolving in a final value for a key
export interface Recipe<TValue = any> {
  action: Action
  key: string
  value: TValue
  instructions: Instruction<TValue>[]
}

function getRecipeUpdate<TRecipe extends Recipe>(recipe: TRecipe) {
  return (action: Action, value?: unknown, ...instructions: TRecipe[`instructions`]) => {
    // update action
    recipe.action = action

    // update value (if undefined)
    if (value !== undefined) recipe.value = value

    // push new instructions
    recipe.instructions.push(...instructions)
  }
}

/**
 * Parse instruction into a recipe (a final value tangled with a "action" describing how to set value to mutable object)
 * Basically we just decipe what to do with the instruction, we dont set values yet
 */
export function parseInstruction<TValue, TCompilableObject extends CompilableObject, TData extends object = InferData<TCompilableObject>>(instruction: Instruction<TValue>, object: TCompilableObject, mutableData: TData) {
  const key = instruction._meta.key
  const mode = instruction.mode
  const instructions = object.instructions[key] ?? []
  const lastInstruction = last(instructions)

  const path = key.split(`.`)

  const newValue = instruction.value

  let recipe: Omit<Recipe<TValue>, `value`> = { action: `pass`, key, instructions: [] }

  // helpers
  const updateRecipe = getRecipeUpdate(recipe as Recipe)
  const getCurrentValue = () => (has(mutableData, key) ? get(mutableData, key) : get(object.data, key)) // first try mutableData, then immutableData

  if (mode === `write`) {
    if (newValue === undefined) {
      // instruction sets no value
      updateRecipe(`ignore`)
    } else {
      const currentValue = getCurrentValue()

      const isCurrentAnObject = !typing.isPrimitive(currentValue) && !isArray(currentValue)
      const isNewAnObject = !typing.isPrimitive(newValue) && !isArray(currentValue)

      const shouldIgnore = isCurrentAnObject && isNewAnObject && Object.keys(newValue as any).length === 0

      // TODO: Implement custom types handling
      if (isCurrentAnObject && typing.isTyped(currentValue)) debugger

      if (shouldIgnore) {
        // instruction sets no value
        updateRecipe(`ignore`)
      } else if (isEqual(newValue, currentValue)) {
        // instruction stays the same
        updateRecipe(`same`)
      } else if (lastInstruction?.mode === `fallback` || currentValue === undefined || ((isString(currentValue) || isArray(currentValue)) && isEmpty(currentValue))) {
        //           CURRENT DATA IS FALLBACK             CURRENT DATA IS NOTHING                      CURRENT DATA IS AN EMPTY STRING/ARRAY
        // if value in data is fallback OR empty, override
        updateRecipe(`set`, newValue, instruction)
      } else {
        const currentIsDict = typeof currentValue === `object` && !isArray(currentValue) && !isNil(currentValue) && !(currentValue instanceof Date) && !(currentValue instanceof RegExp)
        const newIsDict = typeof newValue === `object` && !isArray(newValue) && !isNil(newValue) && !(newValue instanceof Date) && !(newValue instanceof RegExp)

        if (currentIsDict && newIsDict) {
          const currentKeys = Object.keys(currentValue)
          const newKeys = Object.keys(newValue)

          if (intersection(currentKeys, newKeys).length === 0) {
            // if there are no common keys, just merge
            updateRecipe(`merge`, newValue, instruction)
          } else {
            debugger
          }
        } else {
          // CONFLICT, tried to write a value over another written value
          updateRecipe(`conflict`, newValue, instruction)
        }
      }
    }
  } else if (mode === `overwrite`) {
    const currentValue = getCurrentValue()

    if (isEqual(newValue, currentValue)) {
      // instruction stays the same
      updateRecipe(`same`)
    } else {
      // just overwrite whatever is in data
      updateRecipe(`set`, newValue, instruction)
    }
  } else if (mode === `push`) {
    const currentValue = getCurrentValue()

    // set a buffer as an array, if if new value is not an array
    const value = (isArray(newValue) ? newValue : [newValue]) as unknown[]

    if (value.length === 0 && currentValue !== undefined) {
      // there will be no addition to the array (and it already exists, so it will not be a initialization)
      updateRecipe(`same`)
    } else {
      // push buffer to recipe
      updateRecipe(`push`, value, instruction)
    }
  } else if (mode === `merge`) {
    // WARN: Untested when path is longer than 1
    if (path.length > 1) debugger

    updateRecipe(`merge`, newValue, instruction)
  } else if (mode === `fallback`) {
    const currentValue = getCurrentValue()

    // only set if there is no value in data AND newValue is something
    //    if there is already in data, just ignore recipe ("pass")
    if (currentValue === undefined && newValue !== undefined) {
      updateRecipe(`set`, newValue, instruction)
    }
  } else {
    // ERROR: Mode not implemented
    debugger
  }

  return recipe as Recipe<TValue>
}

function extractPaths(key: string, object: unknown) {
  const paths = [key] as string[]

  if (!typing.isPrimitive(object)) {
    // extract all paths in object
    const queue = [{ key, object }]
    while (queue.length > 0) {
      const { key, object } = queue.shift()!

      if (typeof object === `object` && object !== null) {
        for (const [k, v] of Object.entries(object)) {
          let _key = k
          if (_key.includes(`.`)) _key = `["${_key}"]`

          paths.push(`${key}.${_key}`)
          queue.push({ key: `${key}.${_key}`, object: v })
        }
      } else {
        if (!paths.includes(key)) paths.push(key)
      }
    }
  }

  return paths
}

/**
 * Apply a recipe to a data object.
 * Returns all paths were something was changed
 */
export function applyRecipe<TValue, TCompilableObject extends CompilableObject, TData extends object = InferData<TCompilableObject>>(recipe: Recipe<TValue>, object: TCompilableObject, mutableData: TData): string[] {
  const action = recipe.action
  const key = recipe.key

  const path = key.split(`.`)

  const currentValue = get(mutableData, key) ?? get(object.data, key)

  if ([`pass`, `ignore`, `same`].includes(action)) {
    // pass, just do nothing mate
  } else if ([`set`, `push`, `merge`].includes(action)) {
    if (action === `set`) {
      set(mutableData, key, recipe.value)

      return extractPaths(key, recipe.value)
    } else if (action === `push`) {
      const value = [] as unknown[]

      // add current value to buffer
      if (currentValue !== undefined) {
        if (!isArray(currentValue)) value.push(currentValue)
        else {
          // ERROR: Untested when currentValue is already an array
          debugger
        }
      }

      // add recipe value to buffer
      if (isArray(recipe.value)) value.push(...recipe.value)
      else {
        // ERROR: Untested when recipe.value is not an array
        debugger
      }

      const ARRAY_TO_UNDEFINED = currentValue === undefined && isArray(recipe.value) && recipe.value.length > 0
      if (!ARRAY_TO_UNDEFINED) {
        // WARN: Untested if I should add recipe.value OR buffer (what happens with previous value?)
        debugger
      }

      if (path.length === 1) set(mutableData, key, value)
      else {
        // TODO: When array is being pushed to a path longer than 1 (i.e. inside an object), merge a stub object with new array and old parent
        const _parent = path.slice(0, -1).join(`.`)
        const parent = get(mutableData, _parent) ?? get(object.data, _parent)

        // ERROR: Something is off
        if (!parent) debugger

        // merge parent with stub
        const merged = _merge(parent, { [last(path)!]: value })
        set(mutableData, _parent, merged)
      }

      return extractPaths(key, value)
    } else if (action === `merge`) {
      let value = {} as any

      // add current value to buffer (by cloning)
      if (!isNil(currentValue)) value = cloneDeep(currentValue)

      // merge recipe value to buffer
      const merged = _merge(value, recipe.value as object)

      // ERROR: When path is longer than 1
      if (path.length > 1) debugger

      set(mutableData, key, merged)

      return extractPaths(key, recipe.value)
    }
  } else {
    // ERROR: Action not implemented
    debugger
  }

  return []
}

function _merge(A: object, B: object) {
  const merged = {}
  mergeWith(merged, A, B, (srcValue, newValue, key, source, object) => {
    if (srcValue === undefined && newValue !== undefined) return newValue
    else if (srcValue !== undefined && newValue === undefined) return srcValue
    else if (srcValue === newValue) return srcValue

    // source === listMigration
    // object === migration
    debugger
    // if (isOrigin(migration._meta.origin, [`gcs`])) return newValue
    // else if (isOrigin(lastMigration._meta.origin, [`gcs`])) return srcValue

    // ERROR: Mergin not implemented
    debugger
  })

  return merged
}

export function deriveConflictResolutionInstructions<Context extends object = object>(recipe: Recipe, instructionHistory: Instruction[], context: Context) {
  const instruction = recipe.instructions[0]
  const lastInstruction = last(instructionHistory)

  // WARN: Untested
  if (recipe.instructions.length > 1) debugger

  // get resolution for specific conflict
  const resolution = prepareConflictResolution(instruction, lastInstruction)

  // apply correct directive
  if (resolution.directive === `handler`) {
    // if resolution is known, get instructions for resolution
    const conflictInstructions = resolveConflict({ resolution, between: lastInstruction === undefined ? [instruction] : [instruction, lastInstruction] }, context)

    return conflictInstructions
  } else if (resolution.directive === `unresolved`) {
    debugger
    // // if cannot determine how to resolve conflict, print it and log it
    // printConflict(migratableObject.data, recipe.migrations[0], lastMigration, context)

    // // DEBUG: Rerunning recipe for debug
    // const recipe2 = prepareMigrationValue(shadowData, migratableObject, migration)

    // // DEBUG: Rerunning resolution for debug
    // const resolution2 = prepareMigrationConflict(migration, lastMigration)
  } else {
    // ERROR: Directive not implemented
    debugger
  }

  return null
}
