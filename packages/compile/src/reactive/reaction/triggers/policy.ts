import type { EventTrigger, ReactionTrigger } from "."
import { typing } from "../../../../../utils/src"
import * as Reference from "../../../reference/utils"
import { ReactionCause, ReactionHistory } from "../context"
import type { FastReactionTrigger } from "./fast"

/**
 * Path Execution Rule
 * - always:    execute every time the path is updated
 * - once:      execute only once, then "disable" the reaction
 * - fallback:  execute on path update ONLY if reaction has not been executed yet
 */
export type ReactionPolicy = `always` | `once` | `fallback`

/** Validate policy of a reaction target (based on previous history of runs) */
export function validatePolicy(trigger: ReactionCause[`_trigger`], history: ReactionHistory): boolean {
  // _history: Record<string, Record<string, CompilationTrigger[][]>> = {}
  //              object id -> reaction pointer (as string) -> triggers[]
  //

  if (trigger.policy === `always`) return true
  else if (trigger.policy === `fallback`) {
    // only allow if reaction was never ran for any reason

    debugger
  } else if (trigger.policy === `once`) {
    const _trigger = Reference.Trigger.flatten(trigger._reference)

    // only allow if reaction was never ran for a specific path
    if (!history.length) return true

    // history is a linear list of parallel traces ("vertical" array)
    for (const parallelTraces of history) {
      // a parallelTrace is a simultaneous list of traces ("horizontal" array)

      // check if trigger in question was already ran in history (locally, in one of the parallel traces)
      //    a trace is a linear list of causes ("vertical" array)
      for (const triggers of parallelTraces) {
        // so, here, triggers is a linear list of triggers (one trigger causing the other) that caused the reaction to run
        for (const local of triggers) {
          if (local.type !== trigger.type) continue

          const _local = Reference.Trigger.flatten(local._trigger._reference)

          if (_local === _trigger) return false
        }
      }
    }

    debugger
  }

  // ERROR: Unimplemented rule
  debugger

  return false
}
