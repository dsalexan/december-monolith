/* eslint-disable no-debugger */
import { last, get, isArray, cloneDeep, uniq, flattenDeep } from "lodash"
import { asArray } from "@december/utils"
import { completeInstructionIndex } from "./fast"
export const MODES = [`fallback`, `write`, `overwrite`, `push`, `merge`] as const

export function modePriority(mode: Mode) {
  return MODES.indexOf(mode)
}

export type Mode = (typeof MODES)[number]

export type InstructionConflictHandler<TContext extends object = object> = {
  name: string
  (context: TContext, instructions: Instruction[]): InstructionIndex | FastInstructionIndex | null
}

export interface BaseOrigin {
  type: string
  source: string
}

export interface InstructionOrigin extends BaseOrigin {
  type: `instruction`
}

export interface PostOrigin extends BaseOrigin {
  type: `post`
}

export interface StrategyOrigin extends BaseOrigin {
  type: `strategy`
  strategy: any
  reaction: any
}

export interface ConflictOrigin extends BaseOrigin {
  type: `conflict`
  between: Instruction[]
  resolution: InstructionConflictResolution
}

export type Origin = BaseOrigin | InstructionOrigin | PostOrigin | ConflictOrigin | StrategyOrigin

export type Instruction<TValue = any, TOrigin extends Origin = Origin> = {
  _meta: {
    instruction: true
    key: string
    origin: TOrigin[]
    conflictHandler?: InstructionConflictHandler
  }
  value: TValue
  mode: Mode
}

// key -> list of instructions to apply
//    this type exists because we need a good way to link a key to a instruction
//    a FastInstructionIndex links a key to a value, being a "primitive" version of a InstructionIndex
//    a instruction naturally holds its key (_meta.key), but a primitive values doesnt
export type InstructionIndex<TKey extends string | number | symbol = string> = { [P in TKey]?: Instruction[] }
export type FastInstructionIndex<TKey extends string | number | symbol = string> = { [P in TKey]?: (unknown | Instruction) | (unknown | Instruction)[] }

/**
 * Packages value into a Value structure
 */
export function buildInstruction<TValue>(key: string, value: TValue, mode: Mode = `write`): Instruction<TValue> {
  return {
    _meta: {
      instruction: true,
      key,
      origin: [],
    },
    value,
    mode,
  }
}

export function FALLBACK<TValue>(key: string, value: TValue): Instruction<TValue> {
  return buildInstruction(key, value, `fallback`)
}

export function WRITE<TValue>(key: string, value: TValue): Instruction<TValue> {
  return buildInstruction(key, value, `write`)
}

export function OVERWRITE<TValue>(key: string, value: TValue): Instruction<TValue> {
  return buildInstruction(key, value, `overwrite`)
}

export function PUSH<TValue>(key: string, value: TValue): Instruction<TValue> {
  return buildInstruction(key, value, `push`)
}

export function MERGE<TValue>(key: string, value: TValue): Instruction<TValue> {
  return buildInstruction(key, value, `merge`)
}

export function instructionPriority(instruction: Instruction) {
  return modePriority(instruction.mode)
}

// #region Conflict

export interface InstructionConflictResolution {
  directive: `unresolved` | `handler`
  handler?: InstructionConflictHandler
}

/**
 * Prepare conflict resolution for a two instructions
 */
export function prepareConflictResolution(newInstruction: Instruction, oldInstruction: Instruction | undefined) {
  const key = newInstruction._meta.key

  const resolution: InstructionConflictResolution = { directive: `unresolved` }

  // ERROR: Should never happen
  if (newInstruction === undefined || oldInstruction === undefined) debugger
  if (newInstruction._meta === undefined || oldInstruction?._meta === undefined) debugger

  const newInstructionHasHandler = newInstruction._meta.conflictHandler !== undefined

  const onlyNewInstructionHasHandler = newInstructionHasHandler && oldInstruction?._meta.conflictHandler === undefined
  const sameConflictHandler = newInstructionHasHandler && newInstruction._meta.conflictHandler?.name === oldInstruction?._meta.conflictHandler?.name

  // if both (or just newest) instructions have the same conflict handler, resolve by that handler
  if (onlyNewInstructionHasHandler || sameConflictHandler) {
    resolution.directive = `handler`
    resolution.handler = newInstruction._meta.conflictHandler
  }

  // if both instructions have different origin, just let it be unresolved
  return resolution
}

/**
 * Resolve conflict against last instruction (based on resolution description) into a RECIPE
 */
export function resolveConflict(origin: Omit<ConflictOrigin, `type` | `source`>, context: object) {
  if (origin.resolution.directive === `handler`) {
    const handler = origin.resolution.handler!

    const instructions = handler(context, origin.between)

    const conflictResolved = instructions !== null && Object.keys(instructions).length >= 1
    if (conflictResolved) {
      // now instructions hold the necessary steps to resolve the conflict

      // complete POSSIBLE fast instruction index
      const completeInstructions = completeInstructionIndex(instructions, { type: `conflict`, ...origin } as ConflictOrigin, `overwrite`)
      return completeInstructions
    }
  } else if (origin.resolution.directive === `unresolved`) {
    // in case no action can solve the conflict, just pass
  } else {
    // ERROR: Directive not implemented
    debugger
  }

  return null
}

// #endregion
