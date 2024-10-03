import Node from "../../node"

export type BindingResult = {
  result: RuleMatchResult
  out: RuleMatchResult
  match: RuleMatch
}

export type RuleMatchState = {
  matches: BindingResult[]
  result: boolean
}

//
//
//

export type RuleMatchResult = boolean | Node | null | Node[]
export type RuleMatchFunction = (node: Node) => RuleMatchResult

export class RuleMatch {
  private fn: RuleMatchFunction
  //
  public optional: boolean = false

  constructor(fn: RuleMatchFunction) {
    this.fn = fn
  }

  static from(match: RuleMatch | RuleMatchFunction) {
    if (match instanceof RuleMatch) return match

    return new RuleMatch(match)
  }

  exec(originalNode: Node): { out: RuleMatchResult; result: boolean } {
    let out = this.fn(originalNode)

    let result: boolean = true

    // if result is null or false, return false
    if (out === null || out === false) result = false

    // if result is an array, return false if it's empty
    if (Array.isArray(out) && out.length === 0) result = false

    return {
      result,
      out,
    }
  }
}
