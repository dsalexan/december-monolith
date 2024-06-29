/**
 * A Strategy is a collection of Reactions
 * A Reaction is a set of functions (pre, post and process) that are executed in order to generate a list of instructions (upon a change in some keys of the object)
 */

import { ReactionInstruction } from "."
import type CompilationManager from "../../compilation/newManager"
import type { FastInstructionIndex, InstructionIndex } from "../../instruction"
import { ObjectReference } from "../../reference"
import type ReactiveCompilableObject from "../object"
import { ParallelReactionContexts, ReactionContext, ReactionHistory } from "./context"

// export const ReactionContextParallelKeys = [`trigger`, `regex`, `atomic`] as (keyof ParallelReactionContext | `trigger`)[]

export type BaseContext = { history: ReactionHistory; contexts: ParallelReactionContexts }

export type ReactionPreProcessFunction<TData extends object = object, TContext extends BaseContext = BaseContext> = (
  data: TData,
  object: ReactiveCompilableObject<TData>,
  compilationManager: CompilationManager,
  context: TContext,
) => object | null

export type ReactionProcessFunction<TData extends object = object, TContext extends BaseContext = BaseContext> = (
  data: TData,
  object: ReactiveCompilableObject<TData>,
  preProcessedData: object | null,
  compilationManager: CompilationManager,
  context: TContext,
) => [FastInstructionIndex, ReactionInstruction[]] | FastInstructionIndex | null

export type ReactionPostProcessFunction<TData extends object = object, TContext extends BaseContext = BaseContext> = (
  processedInstructions: InstructionIndex | null,
  data: TData,
  object: ReactiveCompilableObject<TData>,
  compilationManager: CompilationManager,
  context: TContext,
) => InstructionIndex | null
