import { isEmpty, isNil } from "lodash"

export function push<TKey extends string | number | symbol = string | number | symbol, TValue = any>(map: Record<TKey, TValue[]>, key: TKey, value: TValue) {
  if (map[key] === undefined) map[key] = []

  map[key].push(value)
}

export function isNilOrEmpty(value: any): value is null | undefined | `` {
  return isNil(value) || isEmpty(value)
}

export function capString(text: string, size: number, ellipsis = `...`, returnAsArray = false) {
  if (text.length <= size) return returnAsArray ? [text] : text

  const components = [text.slice(0, size - ellipsis.length), ellipsis]

  return returnAsArray ? components : components.join(``)
}

export * as typing from "./typing"

export function ranges(numbers: number[]) {
  const ordered = numbers.sort((a, b) => a - b)

  const ranges = [] as [number, number][]

  let currentRange = null as [number, number] | null
  for (let i = 0; i < ordered.length; i++) {
    const number = ordered[i]

    if (currentRange === null) currentRange = [number, number]
    else {
      if (number === currentRange[1] + 1) currentRange[1] = number
      else {
        ranges.push(currentRange)
        currentRange = [number, number]
      }
    }
    // asdasd
  }

  if (currentRange !== null && currentRange.length > 0 && currentRange[0] !== currentRange[1]) ranges.push(currentRange)

  return ranges
}
