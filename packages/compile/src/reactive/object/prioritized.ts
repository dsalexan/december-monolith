import { ReactionReference } from "../../reference"
import { ParallelReaction } from "../reaction"
import { ReactionContext } from "../reaction/context"

export interface PrioritizedReaction<TReactionData extends object = object> {
  priority: number
  reaction: {
    watchlist: number // index at watchlist for target property, watchlist (index) -> IndexedReactionTarget[watchlist]
    reference: ReactionReference
  } & TReactionData
}

export type PrioritizedReactionReference = PrioritizedReaction
export type PrioritizedParallelReaction = PrioritizedReaction<{ context: ReactionContext }>
