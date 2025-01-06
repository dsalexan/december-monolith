import assert from "assert"

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

export function getProgressionStep(progressionString: string, index: number) {
  assert(index >= 0, `Index must be greater than or equal to 0`)

  const steps = progressionString.split(`/`).map(s => parseInt(s))

  // 1. If index is within steps, just return it
  if (index < steps.length) return steps[index]

  // 2. If it is beyond the steps, calculate through natural progression
  const last = steps[steps.length - 1]
  const multiplier = last - steps[steps.length - 2]

  const extraSteps = index - (steps.length - 1)

  return extraSteps * multiplier + last
}

// 2/4
