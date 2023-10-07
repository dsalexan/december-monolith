import { push } from "@december/utils"

export type NamedEntry = { name: string; nameext?: string; fullname: string }

export type NamedIndexMap<TValue = any> = {
  byName: Record<string, TValue[]>
  byNameExt: Record<string, TValue[]>
  byFullname: Record<string, TValue[]>
}

export function makeNamedIndexMap<TValue = any>() {
  return {
    byName: {} as Record<string, TValue[]>,
    byNameExt: {} as Record<string, TValue[]>,
    byFullname: {} as Record<string, TValue[]>,
  } as NamedIndexMap<TValue>
}

export function pushToNamedIndexMap<TEntry extends NamedEntry>(indexMap: NamedIndexMap, entry: TEntry, value: any) {
  const { byName, byNameExt, byFullname } = indexMap

  push(byName, entry.name, value)
  if (entry.nameext !== `` && entry.nameext !== undefined) {
    push(byNameExt, entry.nameext, value)
    push(byFullname, entry.fullname, value)
  }
}
