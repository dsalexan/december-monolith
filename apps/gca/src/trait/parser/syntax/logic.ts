import { makeSyntaticComponent } from "./component"
import { AggregatorSyntaxComponent, SyntaxComponent } from "./types"

export type LogicSyntaxNames = `logic_if`

export const LOGIC_SYNTAX_COMPONENTS = {
  logic_if: makeSyntaticComponent(`aggregator`, `logic_if`, `I`, [], {
    prio: 10,
    grandparents: [`math_function`],
    functionNames: [`@if`],
    patterns: [/[^\w](then)$/i, /[^\w](else)$/i],
  }),
} as Partial<Record<LogicSyntaxNames, SyntaxComponent>>

export const LOGIC_SYNTAX_NAMES = Object.keys(LOGIC_SYNTAX_COMPONENTS) as LogicSyntaxNames[]

export const LOGIC_RECOGNIZED_FUNCTION_INDEX = Object.fromEntries(
  Object.values(LOGIC_SYNTAX_COMPONENTS)
    .map(component => (component as AggregatorSyntaxComponent).functionNames.map(functionName => [functionName, component.name]) as [string, LogicSyntaxNames][])
    .flat(),
)

export const LOGIC_RECOGNIZED_FUNCTIONS = [
  ...(Object.keys(LOGIC_RECOGNIZED_FUNCTION_INDEX) as string[]), //
  `@hasmod`, // string
  `@max`, // number[]
]

export const LOGIC_FUNCTION_NAMES = Object.values(LOGIC_SYNTAX_COMPONENTS).map(component => ({
  functionNames: (component as AggregatorSyntaxComponent).functionNames,
  syntax: component,
})) as { functionNames: (string | RegExp)[]; syntax: AggregatorSyntaxComponent }[]

export const MATH_FUNCTIONS = [
  `BaseSWDice`,
  `BaseTHDice`,
  `BonusAdds`,
  `BonusMults`,
  `Ceiling`,
  `Ceil`,
  `EndsWith`,
  `Fac`,
  `Fix`,
  `Floor`,
  `HasMod`,
  `HasModIncludesText`,
  `HasModIncludesTextMin`,
  `HasModWithTag`,
  `HasModWithTagMin`,
  `HasModWithTagValue`,
  `HasModWithTagValueMin`,
  `If`,
  `IndexedValue`,
  `Int`,
  `IsEven`,
  `ItemHasMod`,
  `ItemsInLibraryGroup`,
  `ItemsInLibraryList`,
  `ItemsInList`,
  `Len`,
  `Log`,
  `Max`,
  `Min`,
  `Modulo`,
  `NLog`,
  `OwnerHasMod`,
  `Power`,
  `Round`,
  `SameText`,
  `Sqr`,
  `StartsWith`,
  `SumList`,
  `TextIndexedValue`,
  `TextIsInList`,
  `TextIsInListAlt`,
  `TextIsInText`,
  `TotalChildrenTag`,
  `TotalOwnerChildrenTag`,
]
