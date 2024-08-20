import { NodePattern } from "./pattern"
import Node from "../node"

/**
 * NODE REPLACEMENT SYSTEM
 *
 * "term replacement system"
 */

export interface OffsetNodePattern {
  pattern: NodePattern
  //
  offset: { horizontal: number; vertical: number }
}
