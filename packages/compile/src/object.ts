/* eslint-disable no-debugger */
import { object } from "zod"
import { Instruction, InstructionIndex, MODES, OVERWRITE, instructionPriority, modePriority, prepareConflictResolution, resolveConflict } from "./instruction"
import { groupBy, isArray, isNil, last, mergeWith, orderBy, reverse, set, uniq, values } from "lodash"
import { Recipe, applyRecipe, deriveConflictResolutionInstructions, parseInstruction } from "./recipe"
import { Context } from "vm"
import { EventEmitter } from "@billjs/event-emitter"
import { StrictPropertyReference } from "./reference"

export type InferData<TCompilableObject extends CompilableObject> = TCompilableObject extends CompilableObject<infer TData> ? TData : never

export function parseRecipeIndex<TCompilableObject extends CompilableObject, TData extends object = InferData<TCompilableObject>>(
  listOfInstructionsORIndexOfInstructionsORListOfIndexOfInstructions: Instruction[] | InstructionIndex | InstructionIndex[],
  compilableObject: TCompilableObject,
  mutableData: TData,
) {
  const recipeIndex = {} as Record<string, Recipe[]>

  // group instructions by key
  let listOfInstructionsByKey = [] as Instruction[][]
  if (isArray(listOfInstructionsORIndexOfInstructionsORListOfIndexOfInstructions)) {
    // LIST OF INSTRUCTIONS
    // LIST OF INDEX OF INSTRUCTIONS

    // determine if it is an array of instructions OR an array of instruction indexes
    //    Instruction[], (key, Instruction[])[] -> InstructionsObject
    const listOfInstructions = [] as Instruction[]
    for (const item of listOfInstructionsORIndexOfInstructionsORListOfIndexOfInstructions) {
      const isInstruction = item && typeof item === `object` && item._meta && (item as Instruction)._meta.instruction

      if (isInstruction) listOfInstructions.push(item as Instruction)
      else {
        const _values = Object.values(item as InstructionIndex).flat() as Instruction[]
        listOfInstructions.push(..._values)
      }
    }

    const instructionIndex = groupBy(listOfInstructions, instruction => instruction._meta.key) // group instructions by key (Instruction[] -> InstructionsObject)

    listOfInstructionsByKey = Object.values(instructionIndex)
  } else {
    // INDEX OF INSTRUCTIONS
    listOfInstructionsByKey = Object.values(listOfInstructionsORIndexOfInstructionsORListOfIndexOfInstructions) as any as Instruction[][]
  }

  // for each group of instructions, parse recipes
  for (const instructionsByKey of listOfInstructionsByKey) {
    // instructionsByKey is a list with all instructions for a given key (the key itself is not relevant)

    if (instructionsByKey.some(instruction => isNil(instruction))) debugger // COMMENT

    // sort instructions by mode priority
    const instructions = orderBy(instructionsByKey, instruction => instructionPriority(instruction))

    // WARN: Never tested
    if (instructions.length > 1) debugger

    for (const instruction of instructions) {
      // get recipe from instruction
      const recipe = parseInstruction(instruction, compilableObject, mutableData)

      if (recipeIndex[recipe.key] === undefined) recipeIndex[recipe.key] = []
      recipeIndex[recipe.key].push(recipe)
    }
  }

  return recipeIndex
}

export function applyRecipeIndex<TCompilableObject extends CompilableObject, TData extends object = InferData<TCompilableObject>, Context extends object = object>(
  recipeIndex: Record<string, Recipe<any>[]>,
  compilableObject: TCompilableObject,
  mutableData: TData,
  context: Context,
) {
  // stack with addicional recipeIndexes that should be applied
  const dependentRecipeIndexes = [] as Record<string, Recipe<any>[]>[]
  let changedPaths: string[] = []

  // apply recipes to compilableObject
  for (const recipes of Object.values(recipeIndex)) {
    // recipes is a list of recipes for a given key

    for (const recipe of recipes) {
      // if there is a conflict, try to resolve it
      if (recipe.action === `conflict`) {
        // "resolving" a conflict means to create additional recipes that should make the conflict disappear
        const instructionHistoryForKey = compilableObject.instructions[recipe.key] ?? []

        const resolutionInstructions = deriveConflictResolutionInstructions(recipe, instructionHistoryForKey, context)

        let resolutionRecipeIndex: Record<string, Recipe[]>
        if (resolutionInstructions) {
          resolutionRecipeIndex = parseRecipeIndex(resolutionInstructions, compilableObject, mutableData)

          // ERROR: C'mon, we just solved a conflict, how could there be other?
          if (Object.values(resolutionRecipeIndex).some(recipes => recipes.some(recipe => recipe.action === `conflict`))) debugger

          // push recipes to stack
          dependentRecipeIndexes.push(resolutionRecipeIndex)
        }

        continue
      }

      // apply recipe to compilableObject
      changedPaths.push(...applyRecipe(recipe, compilableObject, mutableData))
    }
  }

  return { dependentIndexes: dependentRecipeIndexes, changedPaths: uniq(changedPaths) }
}

export default class CompilableObject<TData extends object = object> extends EventEmitter {
  _version = 0
  id: string
  data: TData
  // history of instructions applied to this object
  instructions: Record<string, Instruction[]> // key -> instruction
  instructionKeys: string[] // ordered list of keys added to instructions
  // (reactive shit is inside ReactiveCompilableObject)

  constructor(id: string, data?: TData) {
    super()

    this.id = id

    this.data = (data ?? {}) as TData
    this.instructions = {}
    this.instructionKeys = []
  }

  static make<TData extends object = object>(id: string, data?: TData) {
    return new CompilableObject<TData>(id, data)
  }

  latestInstructions(): { key: string; instruction: Instruction[] }[] {
    return reverse(this.instructionKeys.map(key => ({ key, instruction: this.instructions[key] })))
  }

  // #region Compile

  compile<Context extends object = object>(by: `recipeIndex`, recipeIndex: Record<string, Recipe<any>[]>, mutableData: TData, context: Context): { changedPaths: string[]; recipeIndexes: Record<string, Recipe<any>[]>[] }
  compile<Context extends object = object>(
    by: `instructions`,
    instructions: Instruction[] | InstructionIndex | InstructionIndex[],
    mutableData: TData,
    context: Context,
  ): { changedPaths: string[]; recipeIndexes: Record<string, Recipe<any>[]>[] }
  compile<Context extends object = object>(by: `recipeIndex` | `instructions`, recipeIndexOrInstructions: Record<string, Recipe<any>[]> | Instruction[] | InstructionIndex | InstructionIndex[], mutableData: TData, context: Context) {
    if (by === `recipeIndex`) return this.compileRecipeIndex(recipeIndexOrInstructions as Record<string, Recipe<any>[]>, mutableData, context)
    else if (by === `instructions`) return this.compileInstructions(recipeIndexOrInstructions as Instruction[] | InstructionIndex | InstructionIndex[], mutableData, context)

    // ERROR: Invalid compilation method
    debugger
    throw new Error(`Invalid compilation method`)
  }

  /**
   * Compiles a index of recipes into a compilableObject. Only mutableData is mutated, not the object itself.
   * Returns a stack with all recipes applied to mutableData.
   */
  compileRecipeIndex<Context extends object = object>(_recipeIndex: Record<string, Recipe<any>[]>, mutableData: TData, context: Context) {
    // stack with N recipe books/indexes to apply
    //    initially only one, but as conflicts are resolved, more COULD be added
    const recipeIndexStack = [_recipeIndex]
    const changedPaths: string[] = []

    let i = 0
    while (i < recipeIndexStack.length) {
      const recipeIndex = recipeIndexStack[i]!

      const { dependentIndexes, changedPaths: localChangedPaths } = applyRecipeIndex(recipeIndex, this, mutableData, context)
      recipeIndexStack.push(...dependentIndexes)
      changedPaths.push(...localChangedPaths)

      i++
    }

    return { recipeIndexes: recipeIndexStack, changedPaths }
  }

  /**
   * Compiles instructions into a compilableObject. Only mutableData is mutated, not the object itself.
   * Returns a stack with all recipes applied to mutableData.
   */
  compileInstructions<Context extends object = object>(listOrIndexOfInstructions: Instruction[] | InstructionIndex | InstructionIndex[], mutableData: TData, context: Context) {
    // parse instructions into recipes
    const _recipeIndex = parseRecipeIndex(listOrIndexOfInstructions, this, null as any)

    // compile recipe index
    return this.compileRecipeIndex(_recipeIndex, mutableData, context)
  }

  // #endregion

  update(mutableData: TData, recipeIndexes: Record<string, Recipe<any>[]>[], changedPaths: string[]) {
    if (Object.keys(mutableData).length === 0) return

    const merged = {} as TData

    // merge mutable data into this.data
    mergeWith(merged, this.data, mutableData, (srcValue, newValue, key, source, object) => {
      if (newValue === undefined && srcValue !== undefined) debugger

      const useNewValue = newValue !== undefined
      const useOldValue = srcValue !== undefined && newValue === undefined // TODO: Evaluate if there will be a necessity to add "undefined" as a value
      const noChanges = srcValue === newValue

      if (useNewValue) return newValue
      else if (useOldValue) return srcValue
      else if (noChanges) return srcValue

      debugger
    })

    // update merged data into this.data
    this.data = merged

    // update history of instructions
    //    every recipe IS an instruction, kind of
    for (const recipeIndex of recipeIndexes) {
      for (const recipesByKey of Object.values(recipeIndex)) {
        const key = recipesByKey[0].key

        if (!this.instructionKeys.includes(key)) this.instructionKeys.push(key)

        for (const recipe of recipesByKey) {
          if (this.instructions[recipe.key] === undefined) this.instructions[recipe.key] = []

          this.instructions[recipe.key].push(...recipe.instructions)
        }
      }
    }

    // get all updated keys in data and emit events
    const updatedPaths = uniq(
      recipeIndexes
        .map(index => values(index))
        .flat(Infinity)
        .map((recipe: Recipe) => recipe.key),
    )

    this._version++

    // if (this.id === `12899`) debugger
    this.fire(`update`, { object: this.id, paths: changedPaths, version: this._version })
  }

  set(path: string, value: unknown) {
    const mutableData = {} as any
    const instructions = [OVERWRITE(path, value)]

    const { recipeIndexes, changedPaths } = this.compile(`instructions`, instructions, mutableData, {})
    this.update(mutableData, recipeIndexes, changedPaths)

    return { recipeIndexes, changedPaths }
  }
}

export type UpdateEvent = { object: string; paths: StrictPropertyReference[`path`][]; version: number }
