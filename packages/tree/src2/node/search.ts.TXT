import type Node from "./index"

export type SingleResult = number | null

export function _wrapResult(collection: Node[], index: number | null) {
  if (index === null) return null
  return collection[index] ?? null
}

export function find(collection: Node[], predicate: (node: Node) => boolean): SingleResult {
  const index = collection.findIndex(predicate)
  return index === -1 ? null : index
}

export function next(collection: Node[], index: SingleResult): SingleResult {
  if (index === null) return null
  if (index + 1 < collection.length) return index + 1

  return null
}
