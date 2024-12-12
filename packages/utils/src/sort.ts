import { sortedIndexBy } from "lodash"

export function insertionSort(array: number[]): number[]
export function insertionSort<TValue>(array: TValue[], iteratee: (value: TValue) => number): TValue[]
export function insertionSort<TValue>(array: TValue[], iteratee?: (value: TValue) => number): TValue[] {
  iteratee ??= value => value as unknown as number

  for (let i = 1; i < array.length; i++) {
    let key = array[i]
    let j = i - 1
    while (j >= 0 && iteratee(array[j]) > iteratee(key)) {
      array[j + 1] = array[j]
      j--
    }
    array[j + 1] = key
  }

  return array
}

export function sortedInsert(array: number[], value: number): void
export function sortedInsert<TValue>(array: TValue[], value: TValue, iteratee: (value: TValue) => number): void
export function sortedInsert<TValue>(array: TValue[], value: TValue, iteratee?: (entry: TValue) => number): void {
  iteratee ??= entry => entry as unknown as number
  const index = sortedIndexBy(array, value, iteratee)

  array.splice(index, 0, value)
}
