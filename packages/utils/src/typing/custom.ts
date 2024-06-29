export interface ITyped {
  __type: Record<string, true>
}

export function isOfType<T extends ITyped>(value: ITyped, type: string): value is T {
  const typeMap = value?.__type ?? {}

  return typeMap[type] === true
}

export function isTyped(value: unknown): value is ITyped {
  return (value as any).__type !== undefined
}

export function getTypes(value: ITyped): string[] {
  return Object.keys(value.__type ?? {})
}
