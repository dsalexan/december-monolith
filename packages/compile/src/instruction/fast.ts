/* eslint-disable no-debugger */
import { cloneDeep, isArray, uniq } from "lodash"
import { PUSH, type BaseOrigin, type Instruction, WRITE, Mode, InstructionIndex, FastInstructionIndex, Origin } from "."
import { asArray, isNilOrEmpty } from "@december/utils"

export enum INSTRUCTION_COMPLETE_COMMAND {
  DO_NOTHING = 0,
  REMOVE_KEY = 1,
}

function toInstructions(key: string, value: unknown): Instruction[] {
  let instructions = [] as Instruction[]

  if (isArray(value)) {
    const everyItemIsAnInstruction = value.every(item => (item as Instruction)._meta?.instruction)

    debugger

    if (value.length === 0) {
      // if value is an empty array, just push it?
      debugger // UNTESTED SHIT
      instructions = [PUSH(key, value)]
    } else {
      // if not every item of value array is an instruction, MAKE IT BE
      for (const item of value as Instruction[]) {
        const isAnInstruction = (item as Instruction)?._meta?.instruction

        if (isAnInstruction) instructions.push(item as Instruction)
        else instructions.push(WRITE(key, item))
      }
    }
  } else {
    const item = value as Instruction
    const isInstruction = item?._meta?.instruction

    if (isInstruction) instructions.push(item)
    else instructions.push(WRITE(key, item))
  }

  return instructions

  // V1

  // // WARN: Untested, probably should return  [PUSH(key, value)] <=>  [PUSH(key, [])]
  // if (isArray(value) && value.length === 0) debugger

  // // parse value into an array of values
  // let values = [] as unknown[]
  // if (isArray(value)) values = value
  // else values = [value]

  // // parse every value into instruction
  // const instructions = [] as Instruction[]
  // for (const item of values as Instruction[]) {
  //   const isInstruction = item?._meta?.instruction

  //   let instruction: Instruction

  //   if (isInstruction) instruction = item
  //   else instruction = WRITE(key, item)

  //   instructions.push(instruction)
  // }

  // return instructions

  // V0

  // if (isArray(value)) {
  //   const everyItemIsAnInstruction = value.every(item => (item as Instruction)._meta?.instruction)

  //   if (value.length === 0) {
  //     // if value is an empty array, just push it?
  //     debugger // UNTESTED SHIT
  //     instructions = [PUSH(key, value)]
  //   } else {
  //     // if not every item of value array is an instruction, MAKE IT BE
  //     instructions = value.map(item => {
  //       const isAnInstruction = (item as Instruction)._meta?.instruction
  //       if (isAnInstruction) return item as Instruction

  //       return WRITE(key, item)
  //     })
  //   }
  // } else if (!(value as Instruction)?._meta?.instruction) instructions = [WRITE(key, value)]
  // else instructions = [value as Instruction]

  // return instructions
}

export function completeInstruction(key: string, value: (Instruction | unknown)[] | Instruction | unknown, fastOrigin?: Origin | Origin[], mode?: Mode) {
  // if there is no instructions (or values) for a key, remove it from object
  if (value === undefined) return INSTRUCTION_COMPLETE_COMMAND.REMOVE_KEY

  const instructions = toInstructions(key, value)

  // aggregate and unify sources from instructions
  const instructionSources = uniq(instructions.map(instruction => instruction._meta.origin.map(origin => origin.source)).flat(Infinity))

  //    WARN: Untested
  if (instructionSources.length > 1) debugger
  if (instructionSources.length === 0 && (fastOrigin === undefined || (isArray(fastOrigin) && fastOrigin.length === 0))) debugger

  // compile origins
  const origins = [] as BaseOrigin[]
  for (const _origin of asArray(fastOrigin ?? [])) {
    const origin = cloneDeep(_origin) as BaseOrigin

    // if there is no source in origin, use the first source from instructions
    if (isNilOrEmpty(origin.source) && instructionSources.length > 0) origin.source = instructionSources[0] as string

    // if origin is one of the pre-defined types, compile and complete
    //    it is not REALLY necessary, nothing keeps the original caller from sending the "full" origin
    if (_origin.type === `instruction`) {
      debugger
    }

    origins.push(origin)
  }

  // update instructions
  for (const instruction of instructions) {
    if (mode) instruction.mode = mode

    if (origins.length > 0) {
      const allOriginsAreConflict = origins.every(o => o.type === `conflict`)
      const someOriginsAreConflict = origins.some(o => o.type === `conflict`)

      if (allOriginsAreConflict) instruction._meta.origin = []

      // ERROR: Unimplemented case where SOME (but not all) origins are conflict
      if (!allOriginsAreConflict && someOriginsAreConflict) debugger

      instruction._meta.origin.push(...origins)
    }
  }

  return instructions
}

/**
 * Completes a FastInstructionIndex into a InstructionIndex
 * It mutates the original index object
 */
export function completeInstructionIndex(index: InstructionIndex | FastInstructionIndex, fastOrigin?: Origin | Origin[], mode?: Mode) {
  const remove = [] as string[]

  const completeIndex = {} as InstructionIndex
  const keys = Object.keys(index)

  for (const key of keys) {
    const value = index[key]

    if (key === `modes`) debugger
    const instructions = completeInstruction(key, value, fastOrigin, mode)

    if (instructions === INSTRUCTION_COMPLETE_COMMAND.REMOVE_KEY) remove.push(key)
    else completeIndex[key] = instructions
  }

  // remove keys from instructions object
  for (const key of remove) delete completeIndex[key]

  return completeIndex
}
