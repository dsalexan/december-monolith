import { MaybeArray } from "tsdef"

import Node from "../../../node"

export interface RuleMatchResult {
  value: boolean
  out: RuleMatchOutput
  match: RuleMatch
}

export type RuleMatchOutput = boolean | null | MaybeArray<Node>
export type RuleMatchFunction = (node: Node) => RuleMatchOutput

export interface RuleMatchOptions {
  optional?: boolean
}

export class RuleMatch {
  private fn: RuleMatchFunction
  //
  public optional: boolean = false

  constructor(fn: RuleMatchFunction, options: RuleMatchOptions = {}) {
    this.fn = fn
    this.optional = options.optional ?? false
  }

  static from(match: RuleMatch | RuleMatchFunction) {
    if (match instanceof RuleMatch) return match

    return new RuleMatch(match)
  }

  exec(node: Node): RuleMatchResult {
    let out = this.fn(node)

    let result: boolean = true

    // if result is null or false, return false
    if (out === null || out === false) result = false

    // if result is an array, return false if it's empty
    if (Array.isArray(out) && out.length === 0) result = false

    return { value: result, out, match: this }
  }
}
