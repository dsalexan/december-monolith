import { omit } from "lodash"
import { AggregatorSyntaxComponent, EnclosureSyntaxComponent, SeparatorSyntaxComponent, SyntaxComponent, SyntaxName, SyntaxType } from "./types"

export function makeSyntaticComponent<TComponent extends SyntaxComponent>(
  type: SyntaxType,
  name: SyntaxName,
  prefix: string,
  set: string[],
  options?: Partial<{
    parents: SyntaxName[]
    grandparents: SyntaxName[]
    mathParent: boolean
    mathGrandparent: boolean
    math: boolean
    prio: number | Record<string, number>
    prioBump: Partial<Record<SyntaxName, number>>
    //
    functionNames: string[]
    patterns: RegExp[]
  }>,
) {
  const base = {
    type,
    name,
    prefix,
    set,
    math: name.startsWith(`math_`) || (options?.math ?? false),
    mathParent: options?.mathParent ?? false,
    mathGrandparent: options?.mathGrandparent ?? false,
    prio: (options?.prio ?? 0) as number,
  } as TComponent

  if (type === `math`) {
    base.math = true
  } else if (type === `separator`) {
    const separator = base as SeparatorSyntaxComponent

    if (set.length === 1) separator.char = set[0]
    else separator.set = set

    separator.parents = options?.parents ?? []
    separator.prioBump = options?.prioBump ?? {}
  } else if (type === `aggregator`) {
    const aggregator = base as AggregatorSyntaxComponent

    aggregator.set = set

    aggregator.functionNames = options?.functionNames ?? []
    aggregator.patterns = options?.patterns ?? []

    aggregator.grandparents = options?.grandparents ?? []
    aggregator.parents = options?.parents ?? []
    aggregator.prio = (options?.prio as any) ?? Object.fromEntries(set.map(char => [char, 0] as [string, number]))
  } else if (set.length === 2) {
    const enclosure = base as EnclosureSyntaxComponent

    enclosure.opener = set[0]
    enclosure.closer = set[1]
  } else if ([`string`, `nil`, `list`].includes(type)) {
    // goon
  } else {
    // ERROR: Untested
    debugger
  }

  return base as TComponent
}
