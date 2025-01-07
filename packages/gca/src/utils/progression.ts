import assert from "assert"
import { uniq } from "lodash"
import { isNumeric } from "../../../utils/src/typing"

export interface GetProgressionIndexOptions {
  round?: `floor` | `ceil`
  below?: number
}

export function getProgressionIndex(progressionString: string, inputStep: number, { round, below }: GetProgressionIndexOptions = {}) {
  const steps = progressionString.split(`/`).map(s => parseInt(s))

  // 1. What to do here?
  if (steps.length === 1) debugger

  // 2. Check if inputStep is within steps
  // what to do if inputStep is less than the first step?
  if (inputStep < steps[0]) return below ?? 0

  for (const [index, step] of steps.entries()) {
    if (inputStep === step) return index
    if (inputStep < step) {
      if (round === `floor` || round === undefined) return index - 1
      else if (round === `ceil`) return index
      else debugger
    }
  }

  // 3. Just return natural progression
  const last = steps[steps.length - 1]

  const multiplier = last - steps[steps.length - 2]
  const overflow = inputStep - last

  return Math[round ?? `floor`](overflow / multiplier) + steps.length - 1
}

// 1/2/4/8
// 1/4/8
// 1/4/8/13     // 13 + 5 = 18    // 18 + 5 = 23
// 1/2

export interface GetProgressionStepOptions {
  returnObject?: boolean
  strictSign?: boolean
}

export interface ProgressionStep {
  type: `integer` | `percentage` | `multiplier`
  step: string
  value: number
}

export function getProgressionStep<TValue extends number | ProgressionStep = number | ProgressionStep>(progressionString: string, index: number, { returnObject, strictSign }: GetProgressionStepOptions = {}): TValue {
  assert(index >= 0, `Index must be greater than or equal to 0`)

  // 1. Split steps
  const stepValues = progressionString.split(`/`)

  // 2. Determine output type
  const steps: ProgressionStep[] = stepValues.map(step => {
    let type: `integer` | `percentage` | `multiplier` = `integer`
    if (step.endsWith(`%`)) type = `percentage`
    if (step.startsWith(`*`)) type = `multiplier`

    let value: number
    if (type === `integer`) value = parseInt(step)
    else if (type === `percentage`) value = parseFloat(step.slice(0, -1)) / 100
    else if (type === `multiplier`) value = parseFloat(step.slice(1))
    else throw new Error(`Invalid type: ${type}`)

    if (strictSign && ![`multiplier`].includes(type) && !step.startsWith(`+`)) step = `${value >= 0 ? `+` : ``}${step}`

    assert(!isNaN(value), `Invalid step value: ${step}`)

    return { type, step, value }
  })
  const uniqueTypes = uniq(steps.map(step => step.type))
  assert(uniqueTypes.length === 1, `All steps must be of the same type`)
  const type = uniqueTypes[0]

  let output: number | ProgressionStep

  // 3. If index is within steps, just return it
  if (index < steps.length) output = steps[index]
  // 4. If it is beyond the steps, calculate through natural progression
  else {
    const last = steps[steps.length - 1].value
    const multiplier = last - steps[steps.length - 2].value

    const extraSteps = index - (steps.length - 1)

    const value = extraSteps * multiplier + last
    assert(!isNaN(value), `Invalid value: ${value}`)

    let step: string
    if (type === `integer`) step = value.toString()
    else if (type === `percentage`) step = `${Math.floor(value * 100)}%`
    else if (type === `multiplier`) step = `*${value}`
    else throw new Error(`Invalid type: ${type}`)

    if (strictSign && ![`multiplier`].includes(type)) step = `${value >= 0 ? `+` : ``}${step}`

    output = { type, step, value }
  }

  // 5. Format output correctly
  if (returnObject) return output as TValue
  return output.value as TValue
}

// 2/4

export function isProgression(string: string): boolean {
  const pattern = /^([*+-]?\d+%?)(\/([+*-]?\d+%?))*$/i
  return pattern.test(string)
}
