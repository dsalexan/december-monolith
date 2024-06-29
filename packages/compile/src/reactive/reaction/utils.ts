import { ReactionContext, ReactionTrace } from "./context"

import { Property } from "../../reference/utils"

// #region TRIGGER

export const Trace = { toString }

export function toString(trace: ReactionTrace, context: ReactionContext) {
  // a trace is a sequence of events that caused a reaction to run

  let text = [] as string[]
  for (const cause of trace) {
    let entry = ``

    if (cause._trigger.policy !== `always`) entry = `${cause._trigger.policy}:`

    if (cause.type === `event`) {
      entry += `[${cause.name}]`
    } else if (cause.type === `property`) {
      entry += `${Property.flatten(cause.property)}`
    }

    if (context.regex) {
      entry += `; ${context.regex}`
    }

    if (context.hash) {
      entry += `; ${Object.entries(context.hash)
        .map(([key, value]) => `${key}:${value}`)
        .join(`, `)}`
    }

    text.push(entry)
  }

  return `${text.join(` ▶️ `)}`
}

// #endregion
