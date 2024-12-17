import assert from "assert"
import { AnyObject } from "tsdef"

export interface FunctionProviderEntry<TDict> {
  name: GetKey<TDict>
  fn: GetFunction<TDict>
  override?: boolean
}

export type GetKey<TDict> = keyof TDict
export type GetFunction<TDict, TKey extends GetKey<TDict> = GetKey<TDict>> = TDict[TKey]

export class FunctionProvider<TDict extends AnyObject> {
  public index: TDict = {} as TDict

  /** Add function to index */
  public addFunction<TKey extends GetKey<TDict> = GetKey<TDict>>(name: TKey, fn: GetFunction<TDict>, override?: boolean) {
    const index = this.index as TDict
    if (!override) assert(!index[name], `Function "${String(name)}" was already indexed`)

    index[name] = fn as any
  }

  /** Add multiple functions to index */
  public addDictionary<TDict extends AnyObject>(dict: TDict, override?: boolean): void {
    const entries: FunctionProviderEntry<TDict>[] = []

    const objectEntries = Object.entries(dict) as [GetKey<TDict>, GetFunction<TDict>][]
    for (const [name, fn] of objectEntries) {
      entries.push({ name, fn, override })
    }

    for (const entry of entries) this.addFunction(entry.name as any, entry.fn as any, entry.override)
  }

  /** Return indexed function */
  public getFunction<TKey extends GetKey<TDict> = GetKey<TDict>>(name: TKey): TDict[TKey] {
    const index = this.index as TDict
    assert(index[name], `Function "${String(name)}" doesn't exist`)

    return index[name]
  }

  /** Returns syntactical parser function by name */
  public call<TKey extends GetKey<TDict> = GetKey<TDict>>(name: TKey): GetFunction<TDict, TKey> {
    return this.getFunction<TKey>(name)
  }
}
