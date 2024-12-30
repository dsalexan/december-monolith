import { IGURPSTrait } from "@december/gurps"
import { guessType } from "@december/utils/typing"
import assert from "assert"
import { isEmpty, isNil, max } from "lodash"

export interface IncrementalProgressionCost {
  type: `progression`
  base: number
  increment: number
}

export interface FixedCost {
  type: `fixed`
  value: number
  perLevel?: boolean
}

export type TraitCost = IncrementalProgressionCost | FixedCost

export const TRAIT_COST_TYPES = [`progression`, `fixed`] as const
export type TraitCostType = (typeof TRAIT_COST_TYPES)[number]

export function convertCost(cost: string, upTo?: string): TraitCost {
  const hasSlash = cost.includes(`/`)

  if (!hasSlash) {
    if (cost.includes(`point`) || cost.includes(`+`) || cost.includes(`per`) || cost.includes(`%`)) debugger

    const type = guessType(cost)
    if (type === `number`) {
      const fixedCost: FixedCost = { type: `fixed`, value: parseFloat(cost) }
      assert(!isNaN(fixedCost.value), `Invalid fixed cost`)

      return fixedCost
    }
  }

  const steps = cost.split(`/`)
  if (steps.length === 2) {
    const base = parseFloat(steps[0])
    const nextStep = parseFloat(steps[1])

    assert(!isNaN(base), `Invalid base cost`)
    assert(!isNaN(nextStep), `Invalid next step cost`)

    const increment = nextStep - base

    const cost: IncrementalProgressionCost = { type: `progression`, base, increment }
    return cost
  } else {
    assert(!isNil(upTo) && !isEmpty(upTo), `We need upTo here`)

    // TODO: LimitingTotal
    // TODO: prereq and prereq + X (prob from "needs" in "ref")
    // TODO: parse expression
    debugger
  }

  throw new Error(`Not implemented`)
  return null as any
}

export function calculateCost(level: IGURPSTrait[`level`], cost: TraitCost): number {
  if (cost.type === `progression`) {
    assert(level.system === 0, `Untested`)
    assert(level.base > 0, `Untested`)

    const incrementLevels = max([0, level.base - 1])!
    return cost.base + cost.increment * incrementLevels
  } else if (cost.type === `fixed`) {
    return cost.value
  }
  //
  throw new Error(`Not implemented`)
}
