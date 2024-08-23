import { isString } from "lodash"
import type Node from "."
import assert from "assert"

export const MASTER_SCOPES = [`math`, `text-processing`] as const

export type MasterScope = (typeof MASTER_SCOPES)[number]
export type GenericScope = `string`
export type Scope = MasterScope | GenericScope

export interface ScopeInstruction {
  type: `add` | `remove`
  values: Scope[]
}

export type ScopeEvaluation = Scope | ScopeInstruction

export type ScopeEvaluator = (node: Node) => ScopeEvaluation[]

export class ScopeManager {
  public scopes: {
    master: MasterScope[]
    local: Scope[]
  } = {
    master: [],
    local: [],
  }

  public evaluators: ScopeEvaluator[] = []

  constructor(...masterScopes: MasterScope[]) {
    this.evaluators.push(masterScopeEvaluator(...masterScopes))
    this.evaluators.push(defaultScopeEvaluator)
  }

  addEvaluator(...evaluators: ScopeEvaluator[]) {
    for (const evaluator of evaluators) this.evaluators.push(evaluator)

    return this
  }

  public evaluate(node: Node): Scope[] {
    const scopes: Scope[] = []

    let ancestor: Node | null = node

    while (ancestor) {
      // for eache evaluator in manager
      for (const evaluator of this.evaluators) {
        const evaluations = evaluator(ancestor)
        // for each scope OR instruction in evaluation
        for (const _evaluation of evaluations) {
          const instruction: ScopeInstruction = isString(_evaluation) ? { type: `add`, values: [_evaluation] } : _evaluation

          if (instruction.type === `add`) {
            for (const tag of instruction.values) if (!scopes.includes(tag)) scopes.push(tag)
          } else if (instruction.type === `remove`) {
            debugger
          } else throw new Error(`Invalid instruction type "${instruction.type}"`)
        }
      }

      ancestor = ancestor.parent // continue climbing
    }

    return scopes
  }
}

type TMasterScopeEvaluator = (...masterScopes: MasterScope[]) => ScopeEvaluator
const masterScopeEvaluator: TMasterScopeEvaluator =
  (...masterScopes) =>
  node =>
    node.type.name === `root` ? [...masterScopes] : []

const defaultScopeEvaluator: ScopeEvaluator = node => {
  if (node.type.name === `quotes`) return [`string`]
  if (node.type.name === `string`) return [`string`]

  return []
}

export function getMasterScope(scopes: Scope[]): MasterScope {
  const masterScopes = scopes.filter(scope => MASTER_SCOPES.includes(scope as MasterScope)) as MasterScope[]

  assert(masterScopes.length === 1, `Too many master scopes "${masterScopes.join(`, `)}"`)

  return masterScopes[0]
}
