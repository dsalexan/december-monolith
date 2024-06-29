import { compare } from "@december/utils"

import { makeSyntaxRestriction, SyntaxDefinition, SyntaxDefinitionMap, SyntaxRestriction } from "."
import { SyntaxName } from "../manager"

export function makeResolveSyntaxRestriction(comparison: compare.ComparisonBlueprint, ...syntaxes: (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]) {
  return makeSyntaxRestriction(`resolve`, comparison, ...syntaxes)
}

export function makeReorganizeSyntaxRestriction(comparison: compare.ComparisonBlueprint, ...syntaxes: (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]) {
  return makeSyntaxRestriction(`reorganize`, comparison, ...syntaxes)
}

export function all(...syntaxes: (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]) {
  return makeReorganizeSyntaxRestriction({ oneToManyOperation: `all` }, ...syntaxes)
}

export function allAndNotEmpty(...syntaxes: (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]) {
  return makeReorganizeSyntaxRestriction({ oneToManyOperation: `allAndNotEmpty` }, ...syntaxes)
}

export function some(...syntaxes: (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]): Omit<SyntaxRestriction, `hierarchicalOffset`>
export function some(operation: compare.OneToOneComparisonOperation, ...syntaxes: (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]): Omit<SyntaxRestriction, `hierarchicalOffset`>
export function some(...syntaxesOrOperation: (compare.OneToOneComparisonOperation | SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]): Omit<SyntaxRestriction, `hierarchicalOffset`> {
  let operation: compare.OneToOneComparisonOperation | undefined = undefined

  const isFirstOperation = typeof syntaxesOrOperation[0] === `string` && compare.OneToOneComparisonOperations.includes(syntaxesOrOperation[0] as any)
  if (isFirstOperation) operation = syntaxesOrOperation.shift() as compare.OneToOneComparisonOperation

  const syntaxes = syntaxesOrOperation as (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]
  return makeReorganizeSyntaxRestriction({ oneToManyOperation: `some`, operation }, ...syntaxes)
}

export function none(...syntaxes: (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]) {
  return makeReorganizeSyntaxRestriction({ oneToManyOperation: `none` }, ...syntaxes)
}

export function noneAndNotEmpty(...syntaxes: (SyntaxDefinition | SyntaxName | SyntaxDefinitionMap)[]) {
  return makeReorganizeSyntaxRestriction({ oneToManyOperation: `noneAndNotEmpty` }, ...syntaxes)
}
