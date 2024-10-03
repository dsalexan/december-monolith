import Grammar from "../../type/grammar"

import Node from "../../node"

import { RuleMatchResult, RuleMatch, RuleMatchFunction } from "./match"
import assert from "assert"
import { RuleMutation, RuleMutationContext } from "./mutation/mutation"
import { RuleMutationInstructionGenerator } from "./mutation/instruction"

export type RuleName = string

export interface RuleMatchState {
  value: boolean
  matches: RuleMatchResult[]
}

export interface RuleMutationInstruction {}

export class Rule {
  name: RuleName
  matching: RuleMatch[]
  mutation: RuleMutation

  constructor(name: RuleName, matching: (RuleMatch | RuleMatchFunction)[], mutation: RuleMutation | RuleMutationInstructionGenerator) {
    this.name = name
    this.matching = matching.map(match => RuleMatch.from(match))
    this.mutation = RuleMutation.from(mutation)
  }

  getExecutionID(executionHash: string, ruleSet: string) {
    return Rule.getExecutionID(executionHash, ruleSet, this.name)
  }

  static getExecutionID(executionHash: string, ruleSet: string, rule: string) {
    return `${executionHash}::${ruleSet}::${rule}`
  }

  match(originalNode: Node): RuleMatchState {
    const matches: RuleMatchResult[] = []

    // 1. Match rule against node
    for (let index = 0; index < this.matching.length; index++) {
      const match = this.matching[index]

      const result = match.exec(originalNode)

      matches.push(result)
    }

    // 2. Check if all mandatory ones are true
    const mandatory = matches.filter(({ match }) => !match.optional)
    const optional = matches.filter(({ match }) => match.optional)

    const someOptional = optional.some(({ value }) => value === true)
    const zeroMandatories = mandatory.length === 0
    const allMandatory = mandatory.every(({ value }) => value === true) && !zeroMandatories

    const overallResult = allMandatory || (zeroMandatories && someOptional)

    return { value: overallResult, matches }
  }
}
